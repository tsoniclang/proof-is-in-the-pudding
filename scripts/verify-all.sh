#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
tsonic_repo_root="$(cd "${repo_root}/../tsonic" && pwd)"

typecheck_and_build() {
  local project="$1"
  echo "=== typecheck: ${project} ==="
  (
    cd "${repo_root}/${project}"
    if [[ -n "${TSC_BIN:-}" ]]; then
      "${TSC_BIN}" -p tsconfig.json
    elif [[ -x "./node_modules/.bin/tsc" ]]; then
      ./node_modules/.bin/tsc -p tsconfig.json
    else
      node "${tsonic_repo_root}/node_modules/typescript/bin/tsc" -p tsconfig.json
    fi
  )
  echo "=== build: ${project} ==="
  (
    cd "${repo_root}/${project}"
    if [[ -n "${TSONIC_BIN:-}" ]]; then
      "${TSONIC_BIN}" build
    elif [[ -x "./node_modules/.bin/tsonic" ]]; then
      ./node_modules/.bin/tsonic build
    else
      node "${tsonic_repo_root}/packages/cli/dist/index.js" build
    fi
  )
}

run_console_app() {
  local project="$1"
  echo "=== run: ${project} ==="
  (cd "${repo_root}/${project}" && ./out/app)
}

run_http_server() {
  local project="$1"
  local url="$2"
  local log_file="${repo_root}/${project}/.tmp-server.log"
  echo "=== run (server): ${project} (${url}) ==="

  pushd "${repo_root}/${project}" >/dev/null
  rm -f "${log_file}" >/dev/null 2>&1 || true
  ./out/app >"${log_file}" 2>&1 &
  local pid=$!
  popd >/dev/null

  local ok=0
  for _ in {1..30}; do
    if ! kill -0 "${pid}" >/dev/null 2>&1; then
      echo "FAIL: server exited early: ${project}" >&2
      tail -200 "${log_file}" >&2 || true
      exit 1
    fi
    if curl --silent --fail "${url}" >/dev/null; then
      ok=1
      break
    fi
    sleep 0.2
  done

  kill "${pid}" >/dev/null 2>&1 || true

  # Some servers (notably Node.js bindings hosts) may take a moment to exit on SIGTERM.
  # Keep the verifier deterministic: escalate to SIGKILL after a short grace period.
  for _ in {1..50}; do
    if ! kill -0 "${pid}" >/dev/null 2>&1; then
      break
    fi
    sleep 0.1
  done

  if kill -0 "${pid}" >/dev/null 2>&1; then
    kill -9 "${pid}" >/dev/null 2>&1 || true
  fi

  wait "${pid}" >/dev/null 2>&1 || true

  if grep -q "Unhandled exception\\|An unhandled exception was thrown by the application" "${log_file}" 2>/dev/null; then
    echo "FAIL: server logged unhandled exception: ${project}" >&2
    tail -200 "${log_file}" >&2 || true
    exit 1
  fi

  if [[ "${ok}" != "1" ]]; then
    echo "FAIL: server did not respond: ${project} (${url})" >&2
    tail -200 "${log_file}" >&2 || true
    exit 1
  fi
}

run_aspnetcore_blog() {
  local project="$1"
  local base_url="http://localhost:8090"
  local index_url="${base_url}/"
  local log_file="${repo_root}/${project}/.tmp-server.log"

  echo "=== run (server): ${project} (${base_url}) ==="

  pushd "${repo_root}/${project}" >/dev/null
  rm -f "${log_file}" >/dev/null 2>&1 || true
  ./out/app >"${log_file}" 2>&1 &
  local pid=$!
  popd >/dev/null

  cleanup() {
    kill "${pid}" >/dev/null 2>&1 || true
    for _ in {1..50}; do
      if ! kill -0 "${pid}" >/dev/null 2>&1; then
        break
      fi
      sleep 0.1
    done
    if kill -0 "${pid}" >/dev/null 2>&1; then
      kill -9 "${pid}" >/dev/null 2>&1 || true
    fi
    wait "${pid}" >/dev/null 2>&1 || true
  }

  local ok=0
  for _ in {1..30}; do
    if ! kill -0 "${pid}" >/dev/null 2>&1; then
      cleanup
      echo "FAIL: server exited early: ${project}" >&2
      tail -200 "${log_file}" >&2 || true
      exit 1
    fi
    if curl --silent --fail "${index_url}" >/dev/null; then
      ok=1
      break
    fi
    sleep 0.2
  done

  if [[ "${ok}" != "1" ]]; then
    cleanup
    echo "FAIL: server did not respond: ${project} (${index_url})" >&2
    tail -200 "${log_file}" >&2 || true
    exit 1
  fi

  if ! curl --silent --fail \
    -X POST \
    -H "content-type: application/json" \
    -d '{"title":"Curl Post","content":"Hello from curl"}' \
    "${base_url}/api/posts" >/dev/null; then
    cleanup
    echo "FAIL: POST /api/posts failed: ${project}" >&2
    exit 1
  fi

  if ! curl --silent --fail "${base_url}/api/posts" | grep -q "\"title\":\"Curl Post\""; then
    cleanup
    echo "FAIL: expected POSTed item in list: ${project}" >&2
    tail -200 "${log_file}" >&2 || true
    exit 1
  fi

  cleanup

  if grep -q "Unhandled exception\\|An unhandled exception was thrown by the application" "${log_file}" 2>/dev/null; then
    echo "FAIL: server logged unhandled exception: ${project}" >&2
    tail -200 "${log_file}" >&2 || true
    exit 1
  fi
}

run_aspnetcore_blog_ef() {
  local project="$1"
  local base_url="http://localhost:8091"
  local health_url="${base_url}/api/health"
  local log_file="${repo_root}/${project}/.tmp-server.log"

  echo "=== run (server): ${project} (${base_url}) ==="

  rm -f "${repo_root}/${project}/app.db" \
    "${repo_root}/${project}/app.db-shm" \
    "${repo_root}/${project}/app.db-wal" \
    "${repo_root}/${project}/app.db-journal" >/dev/null 2>&1 || true

  pushd "${repo_root}/${project}" >/dev/null
  rm -f "${log_file}" >/dev/null 2>&1 || true
  ./out/app >"${log_file}" 2>&1 &
  local pid=$!
  popd >/dev/null

  cleanup() {
    kill "${pid}" >/dev/null 2>&1 || true
    for _ in {1..50}; do
      if ! kill -0 "${pid}" >/dev/null 2>&1; then
        break
      fi
      sleep 0.1
    done
    if kill -0 "${pid}" >/dev/null 2>&1; then
      kill -9 "${pid}" >/dev/null 2>&1 || true
    fi
    wait "${pid}" >/dev/null 2>&1 || true
  }

  local ok=0
  for _ in {1..50}; do
    if ! kill -0 "${pid}" >/dev/null 2>&1; then
      cleanup
      echo "FAIL: server exited early: ${project}" >&2
      tail -200 "${log_file}" >&2 || true
      exit 1
    fi
    if curl --silent --fail "${health_url}" >/dev/null; then
      ok=1
      break
    fi
    sleep 0.2
  done

  if [[ "${ok}" != "1" ]]; then
    cleanup
    echo "FAIL: server did not respond: ${project} (${health_url})" >&2
    tail -200 "${log_file}" >&2 || true
    exit 1
  fi

  local post_json
  if ! post_json="$(curl --silent --fail \
    -X POST \
    -H "content-type: application/json" \
    -d '{"title":"Curl Post","content":"Hello from curl"}' \
    "${base_url}/api/posts")"; then
    cleanup
    echo "FAIL: POST /api/posts failed: ${project}" >&2
    exit 1
  fi

  local post_id
  post_id="$(echo "${post_json}" | sed -n 's/.*"id":\([0-9][0-9]*\).*/\1/p')"
  if [[ -z "${post_id}" ]]; then
    cleanup
    echo "FAIL: could not parse post id from response: ${post_json}" >&2
    tail -200 "${log_file}" >&2 || true
    exit 1
  fi

  if ! curl --silent --fail "${base_url}/api/posts" | grep -q "\"id\":${post_id}"; then
    cleanup
    echo "FAIL: expected post in list response: ${post_id}" >&2
    exit 1
  fi
  if ! curl --silent --fail "${base_url}/api/posts/${post_id}" | grep -q "\"title\":\"Curl Post\""; then
    cleanup
    echo "FAIL: expected post detail response: ${post_id}" >&2
    exit 1
  fi

  if ! curl --silent --fail \
    -X POST \
    -H "content-type: application/json" \
    -d '{"author":"curl","body":"Nice post"}' \
    "${base_url}/api/posts/${post_id}/comments" >/dev/null; then
    cleanup
    echo "FAIL: POST /comments failed: ${post_id}" >&2
    exit 1
  fi

  if ! curl --silent --fail "${base_url}/api/posts/${post_id}" | grep -q "\"author\":\"curl\""; then
    cleanup
    echo "FAIL: expected comment in post detail: ${post_id}" >&2
    exit 1
  fi

  if ! curl --silent --fail \
    -X PUT \
    -H "content-type: application/json" \
    -d '{"title":"Curl Post (edited)","content":"Updated"}' \
    "${base_url}/api/posts/${post_id}" >/dev/null; then
    cleanup
    echo "FAIL: PUT /api/posts failed: ${post_id}" >&2
    exit 1
  fi

  if ! curl --silent --fail "${base_url}/api/posts/${post_id}" | grep -F -q "\"title\":\"Curl Post (edited)\""; then
    cleanup
    echo "FAIL: expected updated title: ${post_id}" >&2
    exit 1
  fi

  if ! curl --silent --fail -X DELETE "${base_url}/api/posts/${post_id}" >/dev/null; then
    cleanup
    echo "FAIL: DELETE /api/posts failed: ${post_id}" >&2
    exit 1
  fi
  if curl --silent --fail "${base_url}/api/posts/${post_id}" >/dev/null; then
    cleanup
    echo "FAIL: expected deleted post to be missing: ${post_id}" >&2
    tail -200 "${log_file}" >&2 || true
    exit 1
  fi

  cleanup

  if grep -q "Unhandled exception\\|An unhandled exception was thrown by the application" "${log_file}" 2>/dev/null; then
    echo "FAIL: server logged unhandled exception: ${project}" >&2
    tail -200 "${log_file}" >&2 || true
    exit 1
  fi
}

projects=(
  "bcl/hello-world"
  "bcl/calculator"
  "bcl/fibonacci"
  "bcl/todolist-api"
  "bcl/multithreading"
  "bcl/high-performance"
  "aspnetcore/blog"
  "aspnetcore/blog-ef"
  "js/hello-world"
  "js/calculator"
  "js/fibonacci"
  "js/todolist-api"
  "js/notes-webapp"
  "js/multithreading"
  "nodejs/env-info"
  "nodejs/file-reader"
  "nodejs/webserver"
  "nodejs/multithreading"
)

for project in "${projects[@]}"; do
  typecheck_and_build "${project}"

  case "${project}" in
    "bcl/todolist-api")
      run_http_server "${project}" "http://localhost:8080/todos"
      ;;
    "aspnetcore/blog")
      run_aspnetcore_blog "${project}"
      ;;
    "aspnetcore/blog-ef")
      run_aspnetcore_blog_ef "${project}"
      ;;
    "js/todolist-api")
      run_http_server "${project}" "http://localhost:8080/todos"
      ;;
    "js/notes-webapp")
      run_http_server "${project}" "http://localhost:8081/"
      ;;
    "nodejs/webserver")
      run_http_server "${project}" "http://localhost:3000/"
      ;;
    *)
      run_console_app "${project}"
      ;;
  esac
done

echo "=== ALL PROJECTS VERIFIED ==="
