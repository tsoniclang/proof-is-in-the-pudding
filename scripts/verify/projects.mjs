import assert from "node:assert/strict";
import { constants } from "node:fs";
import { access, mkdir, readFile, readdir, stat } from "node:fs/promises";
import { resolve } from "node:path";
import { assertFiniteOutput, probeServer, serverEnvironment } from "./probes.mjs";
import { runCommand, startServer } from "./runner.mjs";

const bannedGeneratedRuntimeSemantics = [
  /\bSystem\.Reflection\b/u,
  /\bAssembly\.Load\s*\(/u,
  /\bActivator\.CreateInstance\s*\(/u,
  /\bGetPropert(?:y|ies)\s*\(/u,
  /\bGetMethods?\s*\(/u,
  /\bMakeGenericMethod\s*\(/u,
  /\bMethodInfo\.Invoke\s*\(/u,
  /\bdynamic\b/u,
];

export async function executeProject(context, task, project, serverPorts) {
  const projectDirectory = resolve(context.stageRoot, project.path);
  const commonEnvironment = {
    DOTNET_CLI_TELEMETRY_OPTOUT: "1",
    DOTNET_NOLOGO: "1",
    LANG: "C.UTF-8",
    LC_ALL: "C.UTF-8",
    NUGET_PACKAGES: context.nugetPackages,
  };

  if (project.prepareProviderReferences) {
    const userProject = resolve(projectDirectory, project.projectFile);
    await runCommand(context, task, {
      id: `${project.id}-restore-provider-project`,
      executable: "dotnet",
      args: ["restore", userProject, "--locked-mode", "--nologo", "-nodeReuse:false"],
      cwd: projectDirectory,
      memoryMiB: 2_048,
      timeoutMinutes: 10,
      environment: commonEnvironment,
    });
    await runCommand(context, task, {
      id: `${project.id}-prepare-provider-references`,
      executable: "dotnet",
      args: [
        "msbuild",
        userProject,
        "-target:PrepareTsonicProviderReferences",
        "-property:RestoreLockedMode=true",
        "-nodeReuse:false",
        "-nologo",
        "-verbosity:minimal",
      ],
      cwd: projectDirectory,
      memoryMiB: 2_048,
      timeoutMinutes: 10,
      environment: commonEnvironment,
    });
  }

  const cliPath = resolve(
    context.stageRoot,
    project.workspacePath,
    "node_modules/@tsonic/cli/dist/src/index.js",
  );
  const oldSpaceMiB = Math.max(2_048, project.memoryMiB - 768);
  await runCommand(context, task, {
    id: `${project.id}-tsonic`,
    executable: "node",
    args: [`--max-old-space-size=${oldSpaceMiB}`, cliPath, "build", "--project", "tsonic.json"],
    cwd: projectDirectory,
    memoryMiB: project.memoryMiB,
    timeoutMinutes: project.timeoutMinutes,
    environment: commonEnvironment,
  });

  await verifyGeneratedOutput(projectDirectory, project);
  const dotnetProject = project.projectFile === undefined
    ? resolve(projectDirectory, "out/csharp", `${project.assembly}.csproj`)
    : resolve(projectDirectory, project.projectFile);
  await runCommand(context, task, {
    id: `${project.id}-dotnet-build`,
    executable: "dotnet",
    args: [
      "build",
      dotnetProject,
      "--nologo",
      "--verbosity:minimal",
      "--no-incremental",
      "-nodeReuse:false",
      ...(project.prepareProviderReferences ? ["--no-restore"] : []),
    ],
    cwd: projectDirectory,
    memoryMiB: 2_048,
    timeoutMinutes: 10,
    environment: commonEnvironment,
  });

  if (project.kind === "library") return;
  const dll = project.projectFile === undefined
    ? resolve(projectDirectory, "out/csharp/bin/Debug/net10.0", `${project.assembly}.dll`)
    : resolve(projectDirectory, "bin/Debug/net10.0", `${project.assembly}.dll`);
  await access(dll, constants.R_OK);

  if (project.kind === "finite") {
    const executed = await runCommand(context, task, {
      id: `${project.id}-run`,
      executable: "dotnet",
      args: [dll],
      cwd: projectDirectory,
      memoryMiB: 1_024,
      timeoutMinutes: 2,
      environment: commonEnvironment,
    });
    assertFiniteOutput(project, executed.stdout, projectDirectory);
    if (project.nativeAot) await verifyNativeAot(context, task, project, projectDirectory, dotnetProject, commonEnvironment);
    return;
  }

  const port = serverPorts.get(project.id);
  assert.notEqual(port, undefined, `No reserved port exists for ${project.id}.`);
  const runtimeDirectory = resolve(context.runRoot, "runtime", project.id);
  await mkdir(runtimeDirectory, { recursive: true });
  const server = await startServer(context, task, {
    id: `${project.id}-server`,
    executable: "dotnet",
    args: [dll],
    cwd: projectDirectory,
    memoryMiB: 2_048,
    timeoutMinutes: 5,
    environment: {
      ...commonEnvironment,
      ...serverEnvironment(project, port, runtimeDirectory),
    },
  });
  try {
    await probeServer(task, project, server, port);
  } finally {
    await server.stop();
  }
}

async function verifyNativeAot(context, task, project, projectDirectory, dotnetProject, environment) {
  const runtimeIdentifier = currentRuntimeIdentifier();
  assert.notEqual(runtimeIdentifier, undefined, `NativeAOT is unsupported on ${process.platform}/${process.arch}.`);
  const publishDirectory = resolve(projectDirectory, "bin/nativeaot");
  await runCommand(context, task, {
    id: `${project.id}-nativeaot-publish`,
    executable: "dotnet",
    args: [
      "publish",
      dotnetProject,
      "--configuration",
      "Release",
      "--runtime",
      runtimeIdentifier,
      "--self-contained",
      "true",
      "--nologo",
      "--verbosity:minimal",
      "-nodeReuse:false",
      `-p:PublishDir=${publishDirectory}/`,
    ],
    cwd: projectDirectory,
    memoryMiB: 6_144,
    timeoutMinutes: 15,
    environment,
  });
  const executable = resolve(
    publishDirectory,
    process.platform === "win32" ? `${project.assembly}.exe` : project.assembly,
  );
  await access(executable, constants.X_OK);
  const executed = await runCommand(context, task, {
    id: `${project.id}-nativeaot-run`,
    executable,
    args: [],
    cwd: projectDirectory,
    memoryMiB: 1_024,
    timeoutMinutes: 2,
    environment,
  });
  assertFiniteOutput(project, executed.stdout, projectDirectory);
}

async function verifyGeneratedOutput(projectDirectory, project) {
  const outputDirectory = resolve(projectDirectory, "out/csharp");
  const files = await collectFiles(outputDirectory);
  const sourceFiles = files.filter((path) => path.endsWith(".cs"));
  assert.notEqual(sourceFiles.length, 0, `${project.id} emitted no C# source.`);
  const projectFiles = files.filter((path) => path.endsWith(".csproj"));
  assert.equal(
    projectFiles.length,
    project.projectFile === undefined ? 1 : 0,
    `${project.id} violated target-project ownership.`,
  );
  for (const path of sourceFiles) {
    const text = await readFile(path, "utf8");
    for (const pattern of bannedGeneratedRuntimeSemantics) {
      assert.doesNotMatch(text, pattern, `${project.id} generated banned runtime mechanism ${pattern} in ${path}.`);
    }
  }
}

async function collectFiles(root) {
  const files = [];
  async function visit(directory) {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const path = resolve(directory, entry.name);
      if (entry.isDirectory()) await visit(path);
      if (entry.isFile()) files.push(path);
    }
  }
  const rootStat = await stat(root);
  assert.equal(rootStat.isDirectory(), true);
  await visit(root);
  return files.sort();
}

function currentRuntimeIdentifier() {
  const values = {
    "linux/x64": "linux-x64",
    "linux/arm64": "linux-arm64",
    "darwin/x64": "osx-x64",
    "darwin/arm64": "osx-arm64",
    "win32/x64": "win-x64",
    "win32/arm64": "win-arm64",
  };
  return values[`${process.platform}/${process.arch}`];
}
