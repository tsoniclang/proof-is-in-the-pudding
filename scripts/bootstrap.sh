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

echo "=== workspace hygiene ==="
"${repo_root}/scripts/clean-nested-node-modules.sh"

for workspace in "${workspaces[@]}"; do
  echo "=== npm install: ${workspace} ==="
  (cd "${repo_root}/${workspace}" && npm install --no-fund --no-audit)
done

echo "=== DONE ==="
