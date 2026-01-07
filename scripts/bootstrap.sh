#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

projects=(
  "dotnet/hello-world"
  "dotnet/calculator"
  "dotnet/fibonacci"
  "dotnet/todolist-api"
  "dotnet/multithreading"
  "dotnet/high-performance"
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
  echo "=== npm install: ${project} ==="
  (cd "${repo_root}/${project}" && npm install --no-fund --no-audit)
done

echo "=== DONE ==="
