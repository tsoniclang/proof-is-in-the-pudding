#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
mono_root="$(cd "${repo_root}/.." && pwd)"

workspaces=(
  "bcl"
  "js"
  "nodejs"
  "aspnetcore"
  "workspaces/scoped-multi-project"
  "workspaces/unscoped-multi-project"
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

for workspace in "${workspaces[@]}"; do
  workspace_dir="${repo_root}/${workspace}"
  mkdir -p "${workspace_dir}/node_modules/@tsonic"

  for pkg in "${packages[@]}"; do
    src="${mono_root}/${pkg}"
    dst="${workspace_dir}/node_modules/@tsonic/${pkg}"

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
