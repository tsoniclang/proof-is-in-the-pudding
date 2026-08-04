import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";
import { cp, lstat, readFile, readdir, realpath } from "node:fs/promises";
import { relative, resolve } from "node:path";
import {
  localRepositories,
  packageSpecs,
  projectSpecs,
  repoRoot,
  workspaceSpecs,
} from "./config.mjs";
import { recordEvidence, runCommand, runLoggedTask } from "./runner.mjs";

const ignoredDirectoryNames = new Set([
  ".git",
  ".temp",
  ".tests",
  ".tsonic",
  "bin",
  "node_modules",
  "obj",
  "out",
]);

const bannedDirectDependencies = new Set([
  "@tsonic/csharp-js",
  "@tsonic/csharp-runtime",
  "@tsonic/efcore",
  "@tsonic/efcore-sqlite",
]);

const bannedVirtualDependencies = new Set([
  "@tsonic/core",
  "@tsonic/dotnet",
  "@tsonic/globals",
  "@tsonic/js",
]);

export async function verifyArchitecture(root = repoRoot) {
  const files = await collectFiles(root);
  const configs = files
    .filter((path) => path.endsWith("/tsonic.json") || path === "tsonic.json")
    .sort();
  assert.deepEqual(
    configs,
    projectSpecs.map(({ path }) => `${path}/tsonic.json`).sort(),
    "Every non-temporary Tsonic project must have exactly one verifier record.",
  );

  const prohibitedFiles = files.filter((path) =>
    path.endsWith("/tsconfig.json") ||
    path.endsWith("/tsonic.workspace.json") ||
    path.endsWith("/tsonic.package.json") ||
    path.endsWith("/Debug.ts") ||
    [
      "scripts/bootstrap-local.sh",
      "scripts/bootstrap.sh",
      "scripts/clean-nested-node-modules.sh",
    ].includes(path)
  );
  assert.deepEqual(prohibitedFiles, [], `Obsolete proof mechanisms remain: ${prohibitedFiles.join(", ")}`);

  for (const workspace of workspaceSpecs) {
    const manifest = await readJson(resolve(root, workspace.path, "package.json"));
    assert.deepEqual(manifest.workspaces, ["packages/*"], `${workspace.path} must own one canonical workspace glob.`);
    assert.deepEqual(manifest.scripts, { build: workspace.buildScript }, `${workspace.path} root scripts drifted.`);
    assert.equal(manifest.dependencies, undefined, `${workspace.path} root must not own project dependencies.`);
    assert.equal(manifest.devDependencies, undefined, `${workspace.path} root must not own project dependencies.`);
  }

  for (const project of projectSpecs) {
    const projectDirectory = resolve(root, project.path);
    const manifest = await readJson(resolve(projectDirectory, "package.json"));
    const config = await readJson(resolve(projectDirectory, "tsonic.json"));
    const source = await readProjectSource(projectDirectory);
    const usesNodeModules = /(?:from\s+|import\s*)["']node:/u.test(source);
    const expectedDevDependencies = {
      "@tsonic/cli": "0.0.1",
      "@tsonic/target-csharp": "0.0.1",
      ...(usesNodeModules ? { "@tsonic/csharp-nodejs": "0.0.1" } : {}),
    };
    assert.equal(manifest.private, true, `${project.path} must be private.`);
    assert.equal(manifest.type, "module", `${project.path} must be ESM.`);
    const expectedScripts = project.prepareProviderReferences
      ? {
        "prepare:provider": "dotnet restore ProofAspNetCoreBlogEf.csproj --locked-mode --nologo -nodeReuse:false && dotnet msbuild ProofAspNetCoreBlogEf.csproj -target:PrepareTsonicProviderReferences -property:RestoreLockedMode=true -nodeReuse:false -nologo -verbosity:minimal",
        build: "npm run prepare:provider && tsonic build --project tsonic.json",
      }
      : { build: "tsonic build --project tsonic.json" };
    assert.deepEqual(manifest.scripts, expectedScripts, `${project.path} scripts drifted.`);
    assert.deepEqual(manifest.devDependencies, expectedDevDependencies, `${project.path} has the wrong direct compiler/capability dependencies.`);
    assertDependencyPolicy(project.path, manifest);

    assert.equal(config.targets?.length, 1, `${project.path} must select exactly one target.`);
    assert.equal(config.targets[0].id, "csharp", `${project.path} target drifted.`);
    assert.equal(config.targets[0].options?.assemblyName, project.assembly, `${project.path} assembly drifted.`);
    assert.equal(
      config.targets[0].options?.outputType ?? "Library",
      project.kind === "library" ? "Library" : "Exe",
      `${project.path} output type drifted.`,
    );
    assert.deepEqual(
      config.targets[0].surfaces ?? [],
      project.jsSurface ? ["js"] : [],
      `${project.path} source surface drifted.`,
    );
    assert.equal(
      config.targets[0].options?.projectFile,
      project.projectFile,
      `${project.path} user-owned target project drifted.`,
    );
    assert.equal(source.includes("typescriptCompatibility"), false, `${project.path} contains a compatibility compiler path.`);
    assertSourceImportPolicy(project.path, source);
  }

  const completeSource = (
    await Promise.all(files.filter((path) => path.endsWith(".ts")).map((path) => readFile(resolve(root, path), "utf8")))
  ).join("\n");
  for (const marker of [
    "@tsonic/efcore",
    "@tsonic/efcore-sqlite",
    "@tsonic/aspnetcore",
    "@tsonic/nodejs",
    "sourceUsage",
    "sourceMemberNames",
    "TargetSourceUsageHints",
  ]) {
    assert.equal(completeSource.includes(marker), false, `Product proof source contains retired marker '${marker}'.`);
  }

  return {
    files: files.length,
    projects: projectSpecs.length,
    workspaces: workspaceSpecs.length,
  };
}

export async function verifyRepositoryInputs(context) {
  const repositories = { ...localRepositories, proof: repoRoot };
  for (const [name, path] of Object.entries(repositories)) {
    const branch = git(path, ["branch", "--show-current"]);
    const head = git(path, ["rev-parse", "HEAD"]);
    const status = git(path, ["status", "--porcelain"]);
    assert.notEqual(branch, "", `${name} is detached.`);
    assert.equal(status, "", `${name} is dirty and cannot produce an exact proof artifact:\n${status}`);
    recordEvidence(context, `REPOSITORY ${name} branch=${branch} head=${head} dirty=no`);
  }
}

export async function buildPrerequisites(context) {
  const commonEnvironment = { NUGET_PACKAGES: context.nugetPackages };
  const steps = [
    {
      id: "build-tsonic",
      executable: "npm",
      args: ["run", "build"],
      cwd: localRepositories.tsonic,
      memoryMiB: 8_192,
      timeoutMinutes: 30,
      environment: commonEnvironment,
    },
    {
      id: "build-target-csharp",
      executable: "npm",
      args: ["run", "build"],
      cwd: localRepositories.csharp,
      memoryMiB: 8_192,
      timeoutMinutes: 30,
      environment: { ...commonEnvironment, TSONIC_SKIP_DEPENDENCY_BUILDS: "1" },
    },
    {
      id: "build-csharp-nodejs",
      executable: "npm",
      args: ["run", "build"],
      cwd: localRepositories.node,
      memoryMiB: 8_192,
      timeoutMinutes: 30,
      environment: { ...commonEnvironment, TSONIC_SKIP_DEPENDENCY_BUILDS: "1" },
    },
  ];
  for (const step of steps) {
    await runLoggedTask(context, step.id, (task) => runCommand(context, task, step));
  }
  for (const path of [
    resolve(localRepositories.runtime, "runtimes/net10.0/Tsonic.CSharp.Runtime.dll"),
    resolve(localRepositories.js, "runtimes/net10.0/Tsonic.CSharp.Js.dll"),
    resolve(localRepositories.node, "runtimes/net10.0/Tsonic.CSharp.Node.dll"),
  ]) {
    await realpath(path);
    recordEvidence(context, `RUNTIME_ARTIFACT ${path} sha256=${await sha256(path)}`);
  }
  await verifyRepositoryInputs(context);
}

export async function packExactPackages(context) {
  const artifacts = new Map();
  for (const spec of packageSpecs) {
    await runLoggedTask(context, `pack-${spec.id}`, async (task) => {
      const packageDirectory = resolve(spec.repository, spec.path);
      const result = await runCommand(context, task, {
        id: `npm-pack-${spec.id}`,
        executable: "npm",
        args: ["pack", packageDirectory, "--pack-destination", context.packageRoot, "--json"],
        cwd: spec.repository,
        memoryMiB: 1_024,
        timeoutMinutes: 5,
        environment: {},
      });
      const packed = JSON.parse(result.stdout);
      assert.equal(packed.length, 1, `${spec.id} produced an unexpected npm pack result.`);
      const artifactPath = resolve(context.packageRoot, packed[0].filename);
      const artifact = {
        ...spec,
        name: packed[0].name,
        version: packed[0].version,
        path: artifactPath,
        sha256: await sha256(artifactPath),
      };
      artifacts.set(spec.id, artifact);
      recordEvidence(
        context,
        `PACKAGE ${artifact.name}@${artifact.version} file=${packed[0].filename} sha256=${artifact.sha256}`,
      );
    });
  }
  assert.equal(artifacts.size, packageSpecs.length, "Not every local package produced an artifact.");
  return artifacts;
}

export async function createFreshStage(context) {
  await cp(repoRoot, context.stageRoot, {
    recursive: true,
    filter(source) {
      const path = relative(repoRoot, source);
      if (path === "") return true;
      const parts = path.split("/");
      if (parts.some((part) => ignoredDirectoryNames.has(part))) return false;
      if (path.endsWith(".log")) return false;
      return true;
    },
  });
  recordEvidence(context, `STAGED_SOURCE ${context.stageRoot}`);
}

export async function installStagedWorkspaces(context, artifacts) {
  let nextIndex = 0;
  const results = [];
  const workers = Array.from({ length: Math.min(3, workspaceSpecs.length) }, async () => {
    while (nextIndex < workspaceSpecs.length) {
      const workspace = workspaceSpecs[nextIndex++];
      const result = await runLoggedTask(context, `install-${workspace.path}`, async (task) => {
        const selected = [...artifacts.values()].filter((artifact) => !artifact.nodeOnly || workspace.needsNodeCapability);
        const workspaceDirectory = resolve(context.stageRoot, workspace.path);
        await runCommand(context, task, {
          id: `npm-install-${workspace.path}`,
          executable: "npm",
          args: [
            "install",
            "--offline",
            "--ignore-scripts",
            "--no-audit",
            "--no-fund",
            "--no-save",
            "--package-lock=false",
            "--include=dev",
            ...selected.map(({ path }) => path),
          ],
          cwd: workspaceDirectory,
          memoryMiB: 2_048,
          timeoutMinutes: 10,
          environment: {},
        });
        await verifyInstalledWorkspace(workspaceDirectory, workspace, selected);
      });
      results.push(result);
    }
  });
  await Promise.all(workers);
  assert.equal(results.length, workspaceSpecs.length, "Not every workspace was installed.");
  assert.equal(results.every(({ status }) => status === "passed"), true, "A staged workspace install failed.");
}

export async function verifySystemdBoundary(context) {
  const result = await runLoggedTask(context, "systemd-memory-boundary", (task) => runCommand(context, task, {
    id: "systemd-memory-boundary",
    executable: "true",
    args: [],
    cwd: repoRoot,
    memoryMiB: 256,
    timeoutMinutes: 1,
    environment: {},
  }));
  assert.equal(result.status, "passed", "The systemd memory boundary is unavailable.");
}

async function verifyInstalledWorkspace(workspaceDirectory, workspace, selected) {
  const stageRealPath = await realpath(workspaceDirectory);
  for (const artifact of selected) {
    const installed = resolve(workspaceDirectory, "node_modules", ...artifact.name.split("/"));
    const stat = await lstat(installed);
    assert.equal(stat.isSymbolicLink(), false, `${workspace.path} ${artifact.name} is a symlink, not a packed artifact.`);
    const installedRealPath = await realpath(installed);
    assert.equal(installedRealPath.startsWith(`${stageRealPath}/`), true, `${artifact.name} escaped the staged workspace.`);
    const manifest = await readJson(resolve(installed, "package.json"));
    assert.equal(manifest.name, artifact.name);
    assert.equal(manifest.version, artifact.version);
  }
  const nodePath = resolve(workspaceDirectory, "node_modules/@tsonic/csharp-nodejs");
  if (!workspace.needsNodeCapability) {
    await assertMissing(nodePath, `${workspace.path} unexpectedly installed the Node capability.`);
  }
  const packageRoot = resolve(workspaceDirectory, "packages");
  for (const entry of await readdir(packageRoot, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    await assertMissing(
      resolve(packageRoot, entry.name, "node_modules"),
      `${workspace.path}/packages/${entry.name} contains a nested install.`,
    );
  }
}

function assertDependencyPolicy(path, manifest) {
  const dependencies = {
    ...manifest.dependencies,
    ...manifest.devDependencies,
    ...manifest.peerDependencies,
    ...manifest.optionalDependencies,
  };
  for (const name of Object.keys(dependencies)) {
    assert.equal(bannedDirectDependencies.has(name), false, `${path} directly depends on retired/internal package ${name}.`);
    assert.equal(bannedVirtualDependencies.has(name), false, `${path} treats virtual source module ${name} as an npm package.`);
  }
}

function assertSourceImportPolicy(path, source) {
  const imports = [...source.matchAll(/\b(?:import|export)\s+(?:[^"']*?\s+from\s+)?["']([^"']+)["']/gu)]
    .map((match) => match[1]);
  for (const specifier of imports) {
    if (specifier.startsWith(".")) {
      assert.equal(specifier.endsWith(".js"), true, `${path} local import '${specifier}' is not ESM-explicit.`);
    }
    assert.equal(specifier === "@tsonic/js" || specifier === "@tsonic/nodejs", false, `${path} uses a package-root bootstrap import.`);
  }
  const csharpTypeImports = [...source.matchAll(/import\s+([^;]+?)\s+from\s+["']@tsonic\/csharp\/types\.js["']/gu)];
  for (const [, clause] of csharpTypeImports) {
    assert.equal(clause.trimStart().startsWith("type "), true, `${path} imports erased C# aliases as runtime values.`);
  }
}

async function readProjectSource(projectDirectory) {
  const files = await collectFiles(resolve(projectDirectory, "src"));
  return (await Promise.all(files.filter((path) => path.endsWith(".ts")).map((path) => readFile(resolve(projectDirectory, "src", path), "utf8")))).join("\n");
}

async function collectFiles(root) {
  const found = [];
  async function visit(directory) {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      if (entry.isDirectory()) {
        if (!ignoredDirectoryNames.has(entry.name)) await visit(resolve(directory, entry.name));
      } else if (entry.isFile()) {
        found.push(relative(root, resolve(directory, entry.name)));
      }
    }
  }
  await visit(root);
  return found.sort();
}

async function readJson(path) {
  return JSON.parse(await readFile(path, "utf8"));
}

async function assertMissing(path, message) {
  try {
    await lstat(path);
    assert.fail(message);
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
  }
}

function git(cwd, args) {
  const result = spawnSync("git", args, { cwd, encoding: "utf8" });
  assert.equal(result.status, 0, `git ${args.join(" ")} failed in ${cwd}: ${result.stderr}`);
  return result.stdout.trim();
}

function sha256(path) {
  return new Promise((resolveHash, rejectHash) => {
    const hash = createHash("sha256");
    const stream = createReadStream(path);
    stream.on("error", rejectHash);
    stream.on("data", (chunk) => hash.update(chunk));
    stream.on("end", () => resolveHash(hash.digest("hex")));
  });
}
