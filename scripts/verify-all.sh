#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
workspace_parent="$(cd "${repo_root}/.." && pwd)"
local_js_source_package="${workspace_parent}/js/versions/10"
local_nodejs_source_package="${workspace_parent}/nodejs/versions/10"

if [[ -z "${TSONIC_BIN:-}" ]]; then
  echo "FAIL: TSONIC_BIN is not set. Set it to the tsonic CLI path." >&2
  exit 1
fi

echo "=== workspace hygiene ==="
"${repo_root}/scripts/clean-nested-node-modules.sh"

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

overlay_local_source_packages() {
  local workspace_dir="$1"

  case "${workspace_dir}" in
    "${repo_root}/js"|\
    "${repo_root}/nodejs")
      ;;
    *)
      return 0
      ;;
  esac

  if [[ ! -f "${local_js_source_package}/package.json" ]]; then
    echo "FAIL: local @tsonic/js source package not found at ${local_js_source_package}" >&2
    exit 1
  fi

  if [[ ! -f "${local_nodejs_source_package}/package.json" ]]; then
    echo "FAIL: local @tsonic/nodejs source package not found at ${local_nodejs_source_package}" >&2
    exit 1
  fi

  echo "=== overlay local source packages: ${workspace_dir} ==="
  (
    cd "${workspace_dir}" &&
      npm install --no-save --package-lock=false \
        "${local_js_source_package}" \
        "${local_nodejs_source_package}"
  )
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

ensure_workspace_dependencies() {
  ensure_npm_install "${repo_root}/bcl"
  ensure_npm_install "${repo_root}/aspnetcore"
  ensure_npm_install "${repo_root}/js"
  overlay_local_source_packages "${repo_root}/js"
  ensure_npm_install "${repo_root}/nodejs"
  overlay_local_source_packages "${repo_root}/nodejs"
  if [[ -f "${repo_root}/workspaces/scoped-multi-project/package.json" ]]; then
    ensure_npm_install "${repo_root}/workspaces/scoped-multi-project"
  fi
  if [[ -f "${repo_root}/workspaces/unscoped-multi-project/package.json" ]]; then
    ensure_npm_install "${repo_root}/workspaces/unscoped-multi-project"
  fi
}

typecheck_and_build() {
  local project="$1"
  echo "=== typecheck: ${project} ==="
  (
    cd "${repo_root}/${project}"
    "${TSONIC_BIN}" generate
  )
  echo "=== build: ${project} ==="
  (
    cd "${repo_root}/${project}"
    "${TSONIC_BIN}" build --no-generate
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

ensure_workspace_dependencies

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
      run_http_server "${project}" "http://localhost:8765/"
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
