#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
tsonic_repo_root="$(cd "${repo_root}/../tsonic" && pwd)"

typecheck_and_build() {
  local project="$1"
  echo "=== typecheck: ${project} ==="
  (
    cd "${repo_root}/${project}"
    if [[ -x "./node_modules/.bin/tsc" ]]; then
      ./node_modules/.bin/tsc -p tsconfig.json
    else
      node "${tsonic_repo_root}/node_modules/typescript/bin/tsc" -p tsconfig.json
    fi
  )
  echo "=== build: ${project} ==="
  (
    cd "${repo_root}/${project}"
    if [[ -x "./node_modules/.bin/tsonic" ]]; then
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
  echo "=== run (server): ${project} (${url}) ==="

  pushd "${repo_root}/${project}" >/dev/null
  ./out/app &
  local pid=$!
  popd >/dev/null

  local ok=0
  for _ in {1..30}; do
    if curl --silent --fail "${url}" >/dev/null; then
      ok=1
      break
    fi
    sleep 0.2
  done

  kill "${pid}" >/dev/null 2>&1 || true
  wait "${pid}" >/dev/null 2>&1 || true

  if [[ "${ok}" != "1" ]]; then
    echo "FAIL: server did not respond: ${project} (${url})" >&2
    exit 1
  fi
}

projects=(
  "dotnet/hello-world"
  "dotnet/calculator"
  "dotnet/fibonacci"
  "dotnet/todolist-api"
  "dotnet/multithreading"
  "dotnet/high-performance"
  "dotnet/aspnetcore-blog"
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
    "dotnet/todolist-api")
      run_http_server "${project}" "http://localhost:8080/todos"
      ;;
    "dotnet/aspnetcore-blog")
      run_http_server "${project}" "http://localhost:8090/"
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
