#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

echo "=== workspace hygiene ==="
"${repo_root}/scripts/clean-nested-node-modules.sh"

find_nearest_bin() {
  local start_dir="$1"
  local bin_name="$2"
  local dir="${start_dir}"

  while [[ "${dir}" != "/" ]]; do
    local candidate="${dir}/node_modules/.bin/${bin_name}"
    if [[ -x "${candidate}" ]]; then
      echo "${candidate}"
      return 0
    fi
    dir="$(dirname "${dir}")"
  done

  return 1
}

ensure_npm_install() {
  local workspace_dir="$1"
  if [[ ! -f "${workspace_dir}/package.json" ]]; then
    return 0
  fi
  if [[ -d "${workspace_dir}/node_modules" ]]; then
    return 0
  fi
  echo "=== npm install: ${workspace_dir} ==="
  (cd "${workspace_dir}" && npm install)
}

resolve_out_binary() {
  local project_dir="$1"
  local name="app"

  if [[ -f "${project_dir}/tsonic.json" ]]; then
    name="$(node -e "
      const fs = require('fs');
      const cfg = JSON.parse(fs.readFileSync(process.argv[1], 'utf8'));
      const outputName = cfg.outputName ?? cfg.output?.name;
      process.stdout.write(String(outputName ?? 'app'));
    " "${project_dir}/tsonic.json")"
  fi

  if [[ -x "${project_dir}/out/${name}" ]]; then
    echo "${project_dir}/out/${name}"
    return 0
  fi
  if [[ -x "${project_dir}/out/${name}.exe" ]]; then
    echo "${project_dir}/out/${name}.exe"
    return 0
  fi
  if [[ -x "${project_dir}/out/app" ]]; then
    echo "${project_dir}/out/app"
    return 0
  fi
  if [[ -x "${project_dir}/out/app.exe" ]]; then
    echo "${project_dir}/out/app.exe"
    return 0
  fi

  echo "${project_dir}/out/${name}"
  return 0
}

ensure_interop_dlls() {
  ensure_npm_install "${repo_root}/bcl"
  ensure_npm_install "${repo_root}/aspnetcore"
  ensure_npm_install "${repo_root}/js"
  ensure_npm_install "${repo_root}/nodejs"
  if [[ -f "${repo_root}/workspaces/scoped-multi-project/package.json" ]]; then
    ensure_npm_install "${repo_root}/workspaces/scoped-multi-project"
  fi
  if [[ -f "${repo_root}/workspaces/unscoped-multi-project/package.json" ]]; then
    ensure_npm_install "${repo_root}/workspaces/unscoped-multi-project"
  fi

  # JS workspace: copy JSRuntime DLL if needed
  if [[ -f "${repo_root}/js/tsonic.workspace.json" ]] && [[ ! -f "${repo_root}/js/libs/Tsonic.JSRuntime.dll" ]]; then
    echo "=== add js (copy DLLs): js ==="
    local tsonic_bin
    tsonic_bin="$(find_nearest_bin "${repo_root}/js" tsonic)"
    (cd "${repo_root}/js" && "${tsonic_bin}" add js --config tsonic.workspace.json)
  fi

  # Node.js workspace: copy JSRuntime + nodejs DLLs if needed
  if [[ -f "${repo_root}/nodejs/tsonic.workspace.json" ]] && [[ ! -f "${repo_root}/nodejs/libs/nodejs.dll" ]]; then
    echo "=== add nodejs (copy DLLs): nodejs ==="
    local tsonic_bin
    tsonic_bin="$(find_nearest_bin "${repo_root}/nodejs" tsonic)"
    (cd "${repo_root}/nodejs" && "${tsonic_bin}" add nodejs --config tsonic.workspace.json)
  fi
}

typecheck_and_build() {
  local project="$1"
  echo "=== typecheck: ${project} ==="
  (
    cd "${repo_root}/${project}"
    local tsc_bin
    if [[ -n "${TSC_BIN:-}" ]]; then
      tsc_bin="${TSC_BIN}"
    else
      tsc_bin="$(find_nearest_bin "$(pwd)" tsc)"
    fi
    "${tsc_bin}" -p tsconfig.json
  )
  echo "=== build: ${project} ==="
  (
    cd "${repo_root}/${project}"
    local tsonic_bin
    if [[ -n "${TSONIC_BIN:-}" ]]; then
      tsonic_bin="${TSONIC_BIN}"
    else
      tsonic_bin="$(find_nearest_bin "$(pwd)" tsonic)"
    fi
    "${tsonic_bin}" build
  )
}

run_console_app() {
  local project="$1"
  echo "=== run: ${project} ==="
  local project_dir="${repo_root}/${project}"
  local binary
  binary="$(resolve_out_binary "${project_dir}")"
  (cd "${project_dir}" && "./${binary#"${project_dir}/"}")
}

run_http_server() {
  local project="$1"
  local url="$2"
  local log_file="${repo_root}/${project}/.tmp-server.log"
  echo "=== run (server): ${project} (${url}) ==="

  pushd "${repo_root}/${project}" >/dev/null
  rm -f "${log_file}" >/dev/null 2>&1 || true
  local binary
  binary="$(resolve_out_binary "$(pwd)")"
  "./${binary#"$(pwd)/"}" >"${log_file}" 2>&1 &
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
  local binary
  binary="$(resolve_out_binary "$(pwd)")"
  "./${binary#"$(pwd)/"}" >"${log_file}" 2>&1 &
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
  local binary
  binary="$(resolve_out_binary "$(pwd)")"
  "./${binary#"$(pwd)/"}" >"${log_file}" 2>&1 &
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

ensure_interop_dlls

projects=(
  "bcl/packages/hello-world"
  "bcl/packages/calculator"
  "bcl/packages/fibonacci"
  "bcl/packages/todolist-api"
  "bcl/packages/multithreading"
  "bcl/packages/high-performance"
  "aspnetcore/packages/blog"
  "aspnetcore/packages/blog-ef"
  "js/packages/hello-world"
  "js/packages/calculator"
  "js/packages/fibonacci"
  "js/packages/todolist-api"
  "js/packages/notes-webapp"
  "js/packages/multithreading"
  "nodejs/packages/env-info"
  "nodejs/packages/file-reader"
  "nodejs/packages/webserver"
  "nodejs/packages/multithreading"
  "workspaces/scoped-multi-project/packages/domain"
  "workspaces/scoped-multi-project/packages/api"
  "workspaces/unscoped-multi-project/packages/acme-domain"
  "workspaces/unscoped-multi-project/packages/acme-api"
)

for project in "${projects[@]}"; do
  typecheck_and_build "${project}"

  case "${project}" in
    "bcl/packages/todolist-api")
      run_http_server "${project}" "http://localhost:8080/todos"
      ;;
    "aspnetcore/packages/blog")
      run_aspnetcore_blog "${project}"
      ;;
    "aspnetcore/packages/blog-ef")
      run_aspnetcore_blog_ef "${project}"
      ;;
    "js/packages/todolist-api")
      run_http_server "${project}" "http://localhost:8080/todos"
      ;;
    "js/packages/notes-webapp")
      run_http_server "${project}" "http://localhost:8081/"
      ;;
    "nodejs/packages/webserver")
      run_http_server "${project}" "http://localhost:3000/"
      ;;
    "workspaces/scoped-multi-project/packages/domain" | "workspaces/unscoped-multi-project/packages/acme-domain")
      # These are libraries; build/typecheck only.
      ;;
    *)
      run_console_app "${project}"
      ;;
  esac
done

echo "=== ALL PROJECTS VERIFIED ==="
