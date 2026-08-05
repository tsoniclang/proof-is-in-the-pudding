import { availableParallelism } from "node:os";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
export const siblingRoot = resolve(repoRoot, "..");

export const localRepositories = Object.freeze({
  tsonic: process.env.LOCAL_TSONIC ?? resolve(siblingRoot, "tsonic"),
  csharp: process.env.LOCAL_TSONIC_CSHARP ?? resolve(siblingRoot, "tsonic-csharp"),
  runtime: process.env.LOCAL_CSHARP_RUNTIME ?? resolve(siblingRoot, "csharp-runtime"),
  js: process.env.LOCAL_CSHARP_JS ?? resolve(siblingRoot, "csharp-js"),
  node: process.env.LOCAL_CSHARP_NODEJS ?? resolve(siblingRoot, "csharp-nodejs"),
});

export const workspaceSpecs = Object.freeze([
  workspace("aspnetcore", false),
  workspace("bcl", false),
  workspace("js", true),
  workspace("nodejs", true),
  workspace("workspaces/scoped-multi-project", false, "npm run -w @acme/domain build && npm run -w @acme/api build"),
  workspace("workspaces/unscoped-multi-project", false, "npm run -w acme-domain build && npm run -w acme-api build"),
]);

export const providerMaterializationAuditWorkspaces = Object.freeze([
  "aspnetcore",
]);

export const packageSpecs = Object.freeze([
  packageSpec("tsts", localRepositories.tsonic, "packages/tsts"),
  packageSpec("source-core", localRepositories.tsonic, "packages/source-core"),
  packageSpec("target-api", localRepositories.tsonic, "packages/target-api"),
  packageSpec("host", localRepositories.tsonic, "packages/host"),
  packageSpec("cli", localRepositories.tsonic, "packages/cli"),
  packageSpec("csharp-runtime", localRepositories.runtime, "."),
  packageSpec("csharp-js", localRepositories.js, "."),
  packageSpec("target-csharp", localRepositories.csharp, "."),
  packageSpec("csharp-nodejs", localRepositories.node, ".", true),
]);

export const projectSpecs = Object.freeze([
  project("aspnet-ef", "aspnetcore/packages/blog-ef", "aspnetcore", "ProofAspNetCoreBlogEf", "server", "aspnet-ef", {
    memoryMiB: 6_144,
    timeoutMinutes: 25,
    projectFile: "ProofAspNetCoreBlogEf.csproj",
    prepareProviderReferences: true,
  }),
  project("aspnet-blog", "aspnetcore/packages/blog", "aspnetcore", "ProofAspNetCoreBlog", "server", "aspnet-blog", {
    memoryMiB: 6_144,
    timeoutMinutes: 15,
    projectFile: "ProofAspNetCoreBlog.csproj",
  }),
  project("bcl-calculator", "bcl/packages/calculator", "bcl", "ProofBclCalculator", "finite", "calculator"),
  project("bcl-fibonacci", "bcl/packages/fibonacci", "bcl", "ProofBclFibonacci", "finite", "fibonacci"),
  project("bcl-hello", "bcl/packages/hello-world", "bcl", "ProofBclHelloWorld", "finite", "hello", {
    memoryMiB: 6_144,
    projectFile: "ProofBclHelloWorld.csproj",
    nativeAot: true,
  }),
  project("bcl-high-performance", "bcl/packages/high-performance", "bcl", "ProofBclHighPerformance", "finite", "high-performance"),
  project("bcl-parallel", "bcl/packages/multithreading", "bcl", "ProofBclMultithreading", "finite", "bcl-parallel", {
    memoryMiB: 4_096,
  }),
  project("bcl-todo", "bcl/packages/todolist-api", "bcl", "ProofBclTodoList", "server", "bcl-todo", {
    memoryMiB: 4_096,
    timeoutMinutes: 15,
  }),
  project("js-calculator", "js/packages/calculator", "js", "ProofJsCalculator", "finite", "calculator", { jsSurface: true }),
  project("js-concurrency", "js/packages/concurrency", "js", "ProofJsConcurrency", "finite", "js-concurrency", { jsSurface: true }),
  project("js-fibonacci", "js/packages/fibonacci", "js", "ProofJsFibonacci", "finite", "fibonacci", { jsSurface: true }),
  project("js-hello", "js/packages/hello-world", "js", "ProofJsHelloWorld", "finite", "hello", { jsSurface: true }),
  project("js-notes", "js/packages/notes-webapp", "js", "ProofJsNotesWebApp", "server", "js-notes", {
    memoryMiB: 4_096,
    timeoutMinutes: 15,
    jsSurface: true,
  }),
  project("js-todo", "js/packages/todolist-api", "js", "ProofJsTodoList", "server", "js-todo", {
    memoryMiB: 4_096,
    timeoutMinutes: 15,
    jsSurface: true,
  }),
  project("node-concurrency", "nodejs/packages/concurrency", "nodejs", "ProofNodeConcurrency", "finite", "node-concurrency", {
    memoryMiB: 4_096,
    jsSurface: true,
  }),
  project("node-env", "nodejs/packages/env-info", "nodejs", "ProofNodeEnvInfo", "finite", "env-info"),
  project("node-file-reader", "nodejs/packages/file-reader", "nodejs", "ProofNodeFileReader", "finite", "file-reader", { jsSurface: true }),
  project("node-web", "nodejs/packages/webserver", "nodejs", "ProofNodeWebServer", "server", "node-web", {
    memoryMiB: 4_096,
    jsSurface: true,
  }),
  project("scoped-domain", "workspaces/scoped-multi-project/packages/domain", "workspaces/scoped-multi-project", "AcmeDomain", "library"),
  project("scoped-api", "workspaces/scoped-multi-project/packages/api", "workspaces/scoped-multi-project", "AcmeApi", "finite", "scoped-workspace", {
    dependencies: ["scoped-domain"],
  }),
  project("unscoped-domain", "workspaces/unscoped-multi-project/packages/acme-domain", "workspaces/unscoped-multi-project", "AcmeDomain", "library"),
  project("unscoped-api", "workspaces/unscoped-multi-project/packages/acme-api", "workspaces/unscoped-multi-project", "AcmeApi", "finite", "unscoped-workspace", {
    dependencies: ["unscoped-domain"],
  }),
]);

export const workerLimit = positiveInteger(process.env.PROOF_JOBS, Math.min(8, availableParallelism()));
export const memoryBudgetMiB = positiveInteger(process.env.PROOF_MEMORY_MIB, 11_264);

export const dotnetIsolationEnvironment = Object.freeze({
  DOTNET_CLI_TELEMETRY_OPTOUT: "1",
  DOTNET_CLI_USE_MSBUILD_SERVER: "0",
  DOTNET_NOLOGO: "1",
  MSBUILDDISABLENODEREUSE: "1",
  UseSharedCompilation: "false",
});

function workspace(path, needsNodeCapability, buildScript = "npm -ws --if-present run build") {
  return Object.freeze({ path, needsNodeCapability, buildScript });
}

function packageSpec(id, repository, path, nodeOnly = false) {
  return Object.freeze({ id, repository, path, nodeOnly });
}

function project(id, path, workspacePath, assembly, kind, contract, options = {}) {
  return Object.freeze({
    id,
    path,
    workspacePath,
    assembly,
    kind,
    contract,
    dependencies: Object.freeze(options.dependencies ?? []),
    memoryMiB: options.memoryMiB ?? 3_072,
    timeoutMinutes: options.timeoutMinutes ?? 10,
    projectFile: options.projectFile,
    nativeAot: options.nativeAot === true,
    prepareProviderReferences: options.prepareProviderReferences === true,
    jsSurface: options.jsSurface === true,
  });
}

function positiveInteger(value, fallback) {
  if (value === undefined) return fallback;
  const parsed = Number.parseInt(value, 10);
  if (!Number.isSafeInteger(parsed) || parsed <= 0) {
    throw new Error(`Expected a positive integer, received '${value}'.`);
  }
  return parsed;
}
