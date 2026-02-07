#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

workspaces=(
  "bcl"
  "js"
  "nodejs"
  "aspnetcore"
  "workspaces/scoped-multi-project"
  "workspaces/unscoped-multi-project"
)

echo "=== Cleaning nested node_modules in packages/* (workspace hygiene) ==="
for workspace in "${workspaces[@]}"; do
  ws_root="${repo_root}/${workspace}"
  if [[ ! -d "${ws_root}" ]]; then
    continue
  fi

  # Only workspaces that actually have packages/.
  if [[ ! -d "${ws_root}/packages" ]]; then
    continue
  fi

  # Nested installs (running `npm install` inside a workspace package) can create
  # multiple copies of @tsonic/* type packages and cause TS type identity issues.
  # Tsonic examples are meant to be installed at the workspace root only.
  while IFS= read -r -d '' dir; do
    echo "rm -rf ${dir#"$repo_root/"}"
    rm -rf "${dir}"
  done < <(find "${ws_root}/packages" -mindepth 2 -maxdepth 2 -type d -name node_modules -print0)

  # Clean package-level lockfiles too; they encourage per-package installs.
  while IFS= read -r -d '' file; do
    echo "rm -f ${file#"$repo_root/"}"
    rm -f "${file}"
  done < <(find "${ws_root}/packages" -mindepth 2 -maxdepth 2 -type f -name package-lock.json -print0)
done

echo "=== Done ==="
