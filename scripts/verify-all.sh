#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
mkdir -p "${repo_root}/.tests"
exec 9>"${repo_root}/.tests/verify.lock"
if ! flock --nonblock 9; then
  echo "Another Proof Pudding verification run is active." >&2
  exit 1
fi
exec node "${repo_root}/scripts/verify-all.mjs" "$@"
