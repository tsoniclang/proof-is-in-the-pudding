#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
mono_root="$(cd "${repo_root}/.." && pwd)"

projects=(
  "bcl/hello-world"
  "bcl/calculator"
  "bcl/fibonacci"
  "bcl/todolist-api"
  "bcl/multithreading"
  "bcl/high-performance"
  "aspnetcore/blog"
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

packages=(
  "core"
  "dotnet"
  "globals"
  "js"
  "nodejs"
  "microsoft-extensions"
  "aspnetcore"
  "efcore"
  "efcore-sqlite"
  "efcore-sqlserver"
  "efcore-npgsql"
)

for project in "${projects[@]}"; do
  project_dir="${repo_root}/${project}"
  mkdir -p "${project_dir}/node_modules/@tsonic"

  for pkg in "${packages[@]}"; do
    src="${mono_root}/${pkg}"
    dst="${project_dir}/node_modules/@tsonic/${pkg}"

    if [[ ! -d "${src}" ]]; then
      continue
    fi

    if [[ -e "${dst}" ]]; then
      continue
    fi

    ln -s "${src}" "${dst}"
  done
done

echo "=== Local symlinks created ==="
