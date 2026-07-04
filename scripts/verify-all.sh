#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
workspace_parent="$(cd "${repo_root}/.." && pwd)"

LOCAL_TSONIC="${LOCAL_TSONIC:-${workspace_parent}/tsonic}"
LOCAL_TSONIC_CSHARP="${LOCAL_TSONIC_CSHARP:-${workspace_parent}/tsonic-csharp}"
LOCAL_CSHARP_RUNTIME="${LOCAL_CSHARP_RUNTIME:-${workspace_parent}/csharp-runtime}"
LOCAL_CSHARP_JS="${LOCAL_CSHARP_JS:-${workspace_parent}/csharp-js}"
LOCAL_CSHARP_NODEJS="${LOCAL_CSHARP_NODEJS:-${workspace_parent}/csharp-nodejs}"
TSONIC_BIN="${TSONIC_BIN:-${LOCAL_TSONIC}/packages/cli/dist/src/index.js}"

if [[ -z "${NUGET_PACKAGES:-}" ]]; then
  export NUGET_PACKAGES="${PROOF_NUGET_PACKAGES_DIR:-${repo_root}/.tests/nuget/packages}"
fi
mkdir -p "${NUGET_PACKAGES}"

keep_artifacts="${PROOF_KEEP_ARTIFACTS:-0}"

workspace_roots=(
  "${repo_root}/bcl"
  "${repo_root}/aspnetcore"
  "${repo_root}/js"
  "${repo_root}/nodejs"
  "${repo_root}/workspaces/scoped-multi-project"
  "${repo_root}/workspaces/unscoped-multi-project"
)

required_local_paths=(
  "${TSONIC_BIN}"
  "${LOCAL_TSONIC}/packages/cli/package.json"
  "${LOCAL_TSONIC}/packages/source-core/package.json"
  "${LOCAL_TSONIC}/packages/target-api/package.json"
  "${LOCAL_TSONIC}/packages/tsts/package.json"
  "${LOCAL_TSONIC_CSHARP}/package.json"
  "${LOCAL_CSHARP_RUNTIME}/package.json"
  "${LOCAL_CSHARP_JS}/package.json"
  "${LOCAL_CSHARP_NODEJS}/package.json"
  "${LOCAL_CSHARP_RUNTIME}/runtimes/net10.0/Tsonic.CSharp.Runtime.dll"
  "${LOCAL_CSHARP_JS}/runtimes/net10.0/Tsonic.CSharp.Js.dll"
  "${LOCAL_CSHARP_NODEJS}/runtimes/net10.0/Tsonic.CSharp.Node.dll"
)

for required_path in "${required_local_paths[@]}"; do
  if [[ ! -e "${required_path}" ]]; then
    echo "FAIL: required current Tsonic artifact is missing: ${required_path}" >&2
    exit 1
  fi
done

clean_artifacts_under() {
  local workspace_root="$1"
  if [[ "${keep_artifacts}" = "1" || ! -d "${workspace_root}" ]]; then
    return 0
  fi

  while IFS= read -r -d '' artifact_dir; do
    rm -rf "${artifact_dir}"
  done < <(
    find "${workspace_root}" \
      \( -path "*/node_modules" -o -path "*/.git" \) -prune -o \
      \( -type d \( -name ".tsonic" -o -name "generated" -o -name "out" \) -print0 -prune \)
  )

  while IFS= read -r -d '' artifact_file; do
    rm -f "${artifact_file}"
  done < <(
    find "${workspace_root}" \
      \( -path "*/node_modules" -o -path "*/.git" \) -prune -o \
      -type f \( -name ".tmp-server.log" -o -name "app.db" -o -name "app.db-*" \) -print0
  )
}

clean_all_artifacts() {
  if [[ "${keep_artifacts}" = "1" ]]; then
    return 0
  fi
  for workspace_root in "${workspace_roots[@]}"; do
    clean_artifacts_under "${workspace_root}"
  done
}

trap clean_all_artifacts EXIT

echo "=== shared NuGet package cache: ${NUGET_PACKAGES} ==="
if [[ "${keep_artifacts}" = "1" ]]; then
  echo "=== preserving generated test artifacts (PROOF_KEEP_ARTIFACTS=1) ==="
else
  echo "=== cleaning generated test artifacts before and after verification ==="
fi
clean_all_artifacts

echo "=== workspace hygiene ==="
"${repo_root}/scripts/clean-nested-node-modules.sh"

project_dirs=(
  "${repo_root}/bcl/packages/hello-world"
  "${repo_root}/bcl/packages/calculator"
  "${repo_root}/bcl/packages/fibonacci"
  "${repo_root}/bcl/packages/todolist-api"
  "${repo_root}/bcl/packages/multithreading"
  "${repo_root}/bcl/packages/high-performance"
  "${repo_root}/aspnetcore/packages/blog"
  "${repo_root}/aspnetcore/packages/blog-ef"
  "${repo_root}/js/packages/hello-world"
  "${repo_root}/js/packages/calculator"
  "${repo_root}/js/packages/fibonacci"
  "${repo_root}/js/packages/todolist-api"
  "${repo_root}/js/packages/notes-webapp"
  "${repo_root}/js/packages/multithreading"
  "${repo_root}/nodejs/packages/env-info"
  "${repo_root}/nodejs/packages/file-reader"
  "${repo_root}/nodejs/packages/webserver"
  "${repo_root}/nodejs/packages/multithreading"
  "${repo_root}/workspaces/scoped-multi-project/packages/domain"
  "${repo_root}/workspaces/scoped-multi-project/packages/api"
  "${repo_root}/workspaces/unscoped-multi-project/packages/acme-domain"
  "${repo_root}/workspaces/unscoped-multi-project/packages/acme-api"
)

link_path() {
  local link_path="$1"
  local target_path="$2"
  mkdir -p "$(dirname "${link_path}")"
  rm -rf "${link_path}"
  ln -s "${target_path}" "${link_path}"
}

link_installed_tsonic_packages() {
  local project_dir="$1"
  link_path "${project_dir}/node_modules/@tsonic/cli" "${LOCAL_TSONIC}/packages/cli"
  link_path "${project_dir}/node_modules/@tsonic/source-core" "${LOCAL_TSONIC}/packages/source-core"
  link_path "${project_dir}/node_modules/@tsonic/target-api" "${LOCAL_TSONIC}/packages/target-api"
  link_path "${project_dir}/node_modules/@tsonic/tsts" "${LOCAL_TSONIC}/packages/tsts"
  link_path "${project_dir}/node_modules/@tsonic/target-csharp" "${LOCAL_TSONIC_CSHARP}"
  link_path "${project_dir}/node_modules/@tsonic/csharp-runtime" "${LOCAL_CSHARP_RUNTIME}"
  link_path "${project_dir}/node_modules/@tsonic/csharp-js" "${LOCAL_CSHARP_JS}"
  link_path "${project_dir}/node_modules/@tsonic/csharp-nodejs" "${LOCAL_CSHARP_NODEJS}"
  mkdir -p "${project_dir}/node_modules/.bin"
  rm -f "${project_dir}/node_modules/.bin/tsonic"
  ln -s "../@tsonic/cli/dist/src/index.js" "${project_dir}/node_modules/.bin/tsonic"
}

link_workspace_packages() {
  link_path \
    "${repo_root}/workspaces/scoped-multi-project/packages/api/node_modules/@acme/domain" \
    "${repo_root}/workspaces/scoped-multi-project/packages/domain"
  link_path \
    "${repo_root}/workspaces/unscoped-multi-project/packages/acme-api/node_modules/acme-domain" \
    "${repo_root}/workspaces/unscoped-multi-project/packages/acme-domain"
}

prepare_project_links() {
  for project_dir in "${project_dirs[@]}"; do
    if [[ ! -f "${project_dir}/package.json" || ! -f "${project_dir}/tsonic.json" ]]; then
      echo "FAIL: proof project is missing package.json or tsonic.json: ${project_dir}" >&2
      exit 1
    fi
    link_installed_tsonic_packages "${project_dir}"
  done
  link_workspace_packages
}

json_field() {
  local project_dir="$1"
  local expression="$2"
  node --input-type=module -e "
    import { readFileSync } from 'node:fs';
    const cfg = JSON.parse(readFileSync(process.argv[1], 'utf8'));
    const value = (${expression});
    process.stdout.write(String(value ?? ''));
  " "${project_dir}/tsonic.json"
}

assembly_name() {
  json_field "$1" "cfg.targets?.[0]?.options?.assemblyName"
}

output_type() {
  json_field "$1" "cfg.targets?.[0]?.options?.outputType ?? 'Library'"
}

csharp_project_path() {
  local project_dir="$1"
  local assembly
  assembly="$(assembly_name "${project_dir}")"
  echo "${project_dir}/out/csharp/${assembly}.csproj"
}

build_project() {
  local project="$1"
  local project_dir="${repo_root}/${project}"
  echo "=== tsonic build: ${project} ==="
  (cd "${project_dir}" && node "${TSONIC_BIN}" build --project tsonic.json)

  local csharp_project
  csharp_project="$(csharp_project_path "${project_dir}")"
  echo "=== dotnet build: ${project} ==="
  dotnet build "${csharp_project}" --nologo --v:minimal
}

run_console_app() {
  local project="$1"
  local project_dir="${repo_root}/${project}"
  if [[ "$(output_type "${project_dir}")" != "Exe" ]]; then
    return 0
  fi
  local csharp_project
  csharp_project="$(csharp_project_path "${project_dir}")"
  echo "=== dotnet run: ${project} ==="
  (cd "${project_dir}" && dotnet run --project "${csharp_project}" --no-build --no-restore)
}

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

prepare_project_links

for project in "${projects[@]}"; do
  build_project "${project}"
done

console_projects=(
  "bcl/packages/hello-world"
  "bcl/packages/calculator"
  "bcl/packages/fibonacci"
  "bcl/packages/todolist-api"
  "bcl/packages/multithreading"
  "bcl/packages/high-performance"
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
  "workspaces/scoped-multi-project/packages/api"
  "workspaces/unscoped-multi-project/packages/acme-api"
)

for project in "${console_projects[@]}"; do
  run_console_app "${project}"
done

echo "=== proof-is-in-the-pudding verification passed ==="
