import assert from "node:assert/strict";
import { spawn, spawnSync } from "node:child_process";
import {
  appendFile,
  mkdir,
  readFile,
  readdir,
  realpath,
  writeFile,
} from "node:fs/promises";
import { availableParallelism } from "node:os";
import { dirname, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const workspaceParent = resolve(repoRoot, "..");
const local = {
  tsonic: process.env.LOCAL_TSONIC ?? resolve(workspaceParent, "tsonic"),
  csharp: process.env.LOCAL_TSONIC_CSHARP ?? resolve(workspaceParent, "tsonic-csharp"),
  runtime: process.env.LOCAL_CSHARP_RUNTIME ?? resolve(workspaceParent, "csharp-runtime"),
  js: process.env.LOCAL_CSHARP_JS ?? resolve(workspaceParent, "csharp-js"),
  node: process.env.LOCAL_CSHARP_NODEJS ?? resolve(workspaceParent, "csharp-nodejs"),
  efcore: process.env.LOCAL_EFCORE ?? resolve(workspaceParent, "efcore"),
  efcoreSqlite: process.env.LOCAL_EFCORE_SQLITE ?? resolve(workspaceParent, "efcore-sqlite"),
};
const tsonicBin = process.env.TSONIC_BIN ?? resolve(local.tsonic, "packages/cli/dist/src/index.js");
const jobs = parsePositiveInteger(process.env.PROOF_JOBS, Math.min(4, availableParallelism()));
const runStamp = new Date().toISOString().replaceAll(/[:.]/gu, "-");
const runRoot = resolve(repoRoot, ".tests", `verify-${runStamp}-${process.pid}`);
const taskLogRoot = resolve(runRoot, "tasks");
const reportPath = resolve(runRoot, "report.log");
const nugetPackages = process.env.NUGET_PACKAGES ?? resolve(repoRoot, ".tests/nuget/packages");
const verificationStarted = Date.now();
const results = [];
const active = new Map();
const buildResults = new Map();
const logWrites = new Map();
const logWriteErrors = new Map();
let currentPhase = "preflight";

const projects = [
  project("aspnetcore/packages/blog-ef", "ProofAspNetCoreBlogEf", "server", "aspnet-ef"),
  project("aspnetcore/packages/blog", "ProofAspNetCoreBlog", "server", "aspnet-blog"),
  project("bcl/packages/calculator", "ProofBclCalculator", "finite", "calculator"),
  project("bcl/packages/fibonacci", "ProofBclFibonacci", "finite", "fibonacci"),
  project("bcl/packages/hello-world", "ProofBclHelloWorld", "finite", "hello"),
  project("bcl/packages/high-performance", "ProofBclHighPerformance", "finite", "high-performance"),
  project("bcl/packages/multithreading", "ProofBclMultithreading", "finite", "workers"),
  project("bcl/packages/todolist-api", "ProofBclTodoList", "server", "bcl-todo"),
  project("js/packages/calculator", "ProofJsCalculator", "finite", "calculator"),
  project("js/packages/fibonacci", "ProofJsFibonacci", "finite", "fibonacci"),
  project("js/packages/hello-world", "ProofJsHelloWorld", "finite", "hello"),
  project("js/packages/multithreading", "ProofJsMultithreading", "finite", "workers"),
  project("js/packages/notes-webapp", "ProofJsNotesWebApp", "server", "js-notes"),
  project("js/packages/todolist-api", "ProofJsTodoList", "server", "js-todo"),
  project("nodejs/packages/env-info", "ProofNodeEnvInfo", "finite", "env-info"),
  project("nodejs/packages/file-reader", "ProofNodeFileReader", "finite", "file-reader"),
  project("nodejs/packages/multithreading", "ProofNodeMultithreading", "finite", "workers"),
  project("nodejs/packages/webserver", "ProofNodeWebServer", "server", "node-web"),
  project("workspaces/scoped-multi-project/packages/api", "AcmeApi", "finite", "scoped-workspace"),
  project("workspaces/scoped-multi-project/packages/domain", "AcmeDomain", "library"),
  project("workspaces/unscoped-multi-project/packages/acme-api", "AcmeApi", "finite", "unscoped-workspace"),
  project("workspaces/unscoped-multi-project/packages/acme-domain", "AcmeDomain", "library"),
];

await mkdir(taskLogRoot, { recursive: true });
await mkdir(nugetPackages, { recursive: true });
const progressTimer = setInterval(printProgress, 180_000);
progressTimer.unref();

try {
  const preflight = await loggedTask("preflight", async (log) => {
    await verifyInventory(log);
    await verifyLocalLinks(log);
    await recordRepositories(log);
    await verifyBoundedRunner(log);
  });
  if (preflight.status !== "passed") {
    await finish();
    process.exitCode = 1;
  } else {
    currentPhase = "prepare";
    const prepareResults = [];
    for (const step of prepareSteps()) {
      prepareResults.push(await loggedTask(`prepare-${step.id}`, (log) => runCommand(log, step)));
    }
    if (prepareResults.some((result) => result.status !== "passed")) {
      await finish();
      process.exitCode = 1;
    } else {
      await verifyArtifacts();
      currentPhase = "build-prerequisites";
      const libraries = projects.filter(({ kind }) => kind === "library");
      await runPool(libraries, jobs, buildProject);
      currentPhase = "build-projects";
      await runPool(projects.filter(({ kind }) => kind !== "library"), jobs, buildProject);
      currentPhase = "finite-runtime";
      await runPool(projects.filter(({ kind }) => kind === "finite"), jobs, runFiniteProject);
      currentPhase = "server-runtime-primary";
      const primaryServers = projects.filter(({ kind, probe }) => kind === "server" && probe !== "js-todo");
      await runPool(primaryServers, Math.min(jobs, primaryServers.length), runServerProject);
      currentPhase = "server-runtime-secondary";
      await runPool(projects.filter(({ probe }) => probe === "js-todo"), 1, runServerProject);
      await finish();
      if (results.some(({ status }) => status !== "passed")) process.exitCode = 1;
    }
  }
} finally {
  clearInterval(progressTimer);
}

function project(path, assembly, kind, probe) {
  return { path, assembly, kind, probe };
}

function parsePositiveInteger(value, fallback) {
  if (value === undefined) return fallback;
  const parsed = Number.parseInt(value, 10);
  assert(Number.isSafeInteger(parsed) && parsed > 0, `Expected a positive integer, received '${value}'.`);
  return parsed;
}

function prepareSteps() {
  const commonEnvironment = { NUGET_PACKAGES: nugetPackages };
  return [
    command("tsonic", "npm", ["run", "build"], local.tsonic, "10G", 30, commonEnvironment),
    command("target-csharp", "npm", ["run", "build"], local.csharp, "10G", 30, {
      ...commonEnvironment,
      TSONIC_SKIP_DEPENDENCY_BUILDS: "1",
    }),
    command("csharp-nodejs", "npm", ["run", "build"], local.node, "10G", 30, {
      ...commonEnvironment,
      TSONIC_SKIP_DEPENDENCY_BUILDS: "1",
    }),
    command("efcore", "npm", ["run", "build"], local.efcore, "10G", 30, commonEnvironment),
    command("efcore-sqlite", "npm", ["run", "build"], local.efcoreSqlite, "10G", 30, commonEnvironment),
  ];
}

function command(id, executable, args, cwd, memory, timeoutMinutes, environment = {}) {
  return { id, executable, args, cwd, memory, timeoutMinutes, environment };
}

async function loggedTask(id, action) {
  const safeId = id.replaceAll(/[^a-zA-Z0-9_.-]/gu, "_");
  const logPath = resolve(taskLogRoot, `${String(results.length + active.size).padStart(3, "0")}-${safeId}.log`);
  const started = Date.now();
  active.set(id, started);
  console.log(`[start] ${currentPhase} :: ${id}`);
  await writeFile(logPath, `TASK=${id}\nPHASE=${currentPhase}\nSTARTED_AT=${new Date(started).toISOString()}\n`, "utf8");
  let status = "passed";
  let error;
  try {
    await action(logPath);
  } catch (caught) {
    status = "failed";
    error = caught instanceof Error ? caught.stack ?? caught.message : String(caught);
    queueLog(logPath, `\nERROR\n${error}\n`);
  }
  const ended = Date.now();
  queueLog(
    logPath,
    `\nSTATUS=${status}\nFINISHED_AT=${new Date(ended).toISOString()}\nDURATION_MS=${ended - started}\n`,
  );
  await flushLog(logPath);
  const result = { id, phase: currentPhase, status, error, logPath, started, ended };
  results.push(result);
  active.delete(id);
  console.log(`[${status}] ${currentPhase} :: ${id} :: ${formatDuration(ended - started)}`);
  return result;
}

async function runCommand(logPath, spec, capture = false) {
  const boundedArgs = [
    "--user",
    "--scope",
    "--quiet",
    "-p",
    `MemoryMax=${spec.memory}`,
    "-p",
    "MemorySwapMax=0",
    spec.executable,
    ...spec.args,
  ];
  const rendered = ["systemd-run", ...boundedArgs].map(renderArgument).join(" ");
  queueLog(logPath, `\nCOMMAND=${rendered}\nCWD=${spec.cwd}\n`);
  const chunks = [];
  const child = spawn("systemd-run", boundedArgs, {
    cwd: spec.cwd,
    env: { ...process.env, ...spec.environment },
    detached: true,
    stdio: ["ignore", "pipe", "pipe"],
  });
  const appendChunk = (chunk) => {
    if (capture) chunks.push(chunk);
    queueLog(logPath, chunk);
  };
  child.stdout.on("data", appendChunk);
  child.stderr.on("data", appendChunk);
  const timeout = setTimeout(() => terminateProcessGroup(child, "SIGKILL"), spec.timeoutMinutes * 60_000);
  const outcome = await new Promise((resolveOutcome, rejectOutcome) => {
    child.once("error", rejectOutcome);
    child.once("close", (code, signal) => resolveOutcome({ code, signal }));
  });
  clearTimeout(timeout);
  assert.equal(outcome.signal, null, `${spec.id} terminated by ${outcome.signal}.`);
  assert.equal(outcome.code, 0, `${spec.id} exited with code ${outcome.code}.`);
  return Buffer.concat(chunks).toString("utf8");
}

async function runPool(items, limit, worker) {
  let nextIndex = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (nextIndex < items.length) {
      const item = items[nextIndex++];
      await worker(item);
    }
  });
  await Promise.all(workers);
}

async function buildProject(item) {
  const result = await loggedTask(`build-${item.path}`, async (log) => {
    const cwd = resolve(repoRoot, item.path);
    await runCommand(log, command(
      `tsonic-${item.path}`,
      "node",
      ["--max-old-space-size=5120", tsonicBin, "build", "--project", "tsonic.json"],
      cwd,
      "8G",
      25,
      { NUGET_PACKAGES: nugetPackages },
    ));
    await runCommand(log, command(
      `dotnet-${item.path}`,
      "dotnet",
      ["build", resolve(cwd, "out/csharp", `${item.assembly}.csproj`), "--nologo", "--verbosity:minimal", "--no-incremental"],
      cwd,
      "5G",
      15,
      { NUGET_PACKAGES: nugetPackages },
    ));
  });
  buildResults.set(item.path, result);
}

async function runFiniteProject(item) {
  await loggedTask(`run-${item.path}`, async (log) => {
    requireBuild(item);
    const dll = resolve(repoRoot, item.path, "out/csharp/bin/Debug/net10.0", `${item.assembly}.dll`);
    const output = await runCommand(log, command(
      `run-${item.path}`,
      "dotnet",
      [dll],
      repoRoot,
      "2G",
      2,
      { NUGET_PACKAGES: nugetPackages },
    ), true);
    assertFiniteOutput(item.probe, output);
  });
}

async function runServerProject(item) {
  await loggedTask(`run-${item.path}`, async (log) => {
    requireBuild(item);
    const projectDirectory = resolve(repoRoot, item.path);
    const runtimeDirectory = resolve(runRoot, "runtime", item.probe);
    await mkdir(runtimeDirectory, { recursive: true });
    const dll = resolve(projectDirectory, "out/csharp/bin/Debug/net10.0", `${item.assembly}.dll`);
    const server = serverCase(item.probe);
    const serverArgs = [
      "--user",
      "--scope",
      "--quiet",
      "-p",
      "MemoryMax=3G",
      "-p",
      "MemorySwapMax=0",
      "dotnet",
      dll,
    ];
    queueLog(log, `\nCOMMAND=${["systemd-run", ...serverArgs].map(renderArgument).join(" ")}\n`);
    const child = spawn("systemd-run", serverArgs, {
      cwd: server.isolatedWorkingDirectory ? runtimeDirectory : projectDirectory,
      env: {
        ...process.env,
        NUGET_PACKAGES: nugetPackages,
        TS_PUDDING_DB: resolve(runtimeDirectory, "app.db"),
      },
      detached: true,
      stdio: ["ignore", "pipe", "pipe"],
    });
    child.stdout.on("data", (chunk) => queueLog(log, chunk));
    child.stderr.on("data", (chunk) => queueLog(log, chunk));
    try {
      await waitForReady(server.ready, child, log);
      await server.probe(log);
    } finally {
      await stopServer(child);
    }
  });
}

function requireBuild(item) {
  const result = buildResults.get(item.path);
  assert.notEqual(result, undefined, `No build result exists for ${item.path}.`);
  assert.equal(result.status, "passed", `Build prerequisite failed for ${item.path}.`);
}

function assertFiniteOutput(kind, output) {
  const required = {
    hello: ["Hello from Tsonic!"],
    calculator: ["add(x, y) = 13", "subtract(x, y) = 7", "multiply(x, y) = 30", "divide(x, y) = 3.3333333333333335", "Error: Division by zero!"],
    fibonacci: ["fib(0) = 0", "fib(10) = 55", "fib(40) = 102334155"],
    "high-performance": ["Created Span with 10 elements", "[1, 2, 99, 99, 99, 99, 99, 8, 9, 10]", "After copy: [100, 200, 300, 0, 0]", "Done!"],
    workers: ["Worker 1: 4999950000", "Worker 2: 4999950000", "Worker 3: 4999950000", "Total: 14999850000"],
    "env-info": ["Platform: linux", "Architecture: x64", "Basename: file.txt", "Dirname: /home/user/documents", "Extension: .txt", "Joined path: home/user/docs"],
    "file-reader": ["Reading current directory...", "Reading README.md...", "# proof-is-in-the-pudding", "## Full verifier"],
    "scoped-workspace": ["1: Make npm workspaces work in Tsonic (todo)", "1: Make npm workspaces work in Tsonic (done)"],
    "unscoped-workspace": ["1: Make npm workspaces work in Tsonic (unscoped) (todo)", "1: Make npm workspaces work in Tsonic (unscoped) (done)"],
  }[kind];
  assert.notEqual(required, undefined, `No finite output contract exists for '${kind}'.`);
  for (const marker of required) assert.match(output, new RegExp(escapeRegExp(marker), "u"));
}

function serverCase(id) {
  const cases = {
    "bcl-todo": { ready: "http://localhost:8080/todos", probe: probeTodoApi },
    "js-todo": { ready: "http://localhost:8080/todos", probe: probeTodoApi },
    "js-notes": { ready: "http://localhost:8081/healthz", probe: probeNotesApi },
    "node-web": { ready: "http://localhost:8765/", probe: probeNodeWeb },
    "aspnet-blog": { ready: "http://localhost:8090/api/posts", probe: probeAspNetBlog },
    "aspnet-ef": { ready: "http://localhost:8091/api/health", probe: probeAspNetEf, isolatedWorkingDirectory: true },
  };
  const selected = cases[id];
  assert.notEqual(selected, undefined, `No server contract exists for '${id}'.`);
  return selected;
}

async function waitForReady(url, child, log) {
  const deadline = Date.now() + 45_000;
  while (Date.now() < deadline) {
    assert.equal(child.exitCode, null, `Server exited before readiness with code ${child.exitCode}.`);
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(1_000) });
      queueLog(log, `\nREADY ${url} ${response.status}\n`);
      return;
    } catch {
      await sleep(100);
    }
  }
  assert.fail(`Server did not become ready at ${url}.`);
}

async function request(log, url, options, expectedStatus) {
  const method = options?.method ?? "GET";
  const response = await fetch(url, { ...options, signal: AbortSignal.timeout(8_000) });
  const text = await response.text();
  queueLog(log, `REQUEST ${method} ${url}\nSTATUS ${response.status}\nBODY ${text.slice(0, 2_000)}\n`);
  assert.equal(response.status, expectedStatus, `${method} ${url}: ${text}`);
  return text;
}

async function probeTodoApi(log) {
  const base = "http://localhost:8080/todos";
  assert.equal(JSON.parse(await request(log, base, undefined, 200)).length, 3);
  await request(log, base, jsonRequest("POST", "{"), 400);
  await request(log, base, jsonRequest("POST", JSON.stringify({ wrong: "shape" })), 400);
  const created = JSON.parse(await request(log, base, jsonRequest("POST", JSON.stringify({ title: "Airplane grade" })), 201));
  assert.deepEqual({ title: created.title, completed: created.completed }, { title: "Airplane grade", completed: false });
  const itemUrl = `${base}/${created.id}`;
  const updated = JSON.parse(await request(log, itemUrl, jsonRequest("PUT", JSON.stringify({ title: "Verified", completed: true })), 200));
  assert.deepEqual({ title: updated.title, completed: updated.completed }, { title: "Verified", completed: true });
  await request(log, itemUrl, { method: "DELETE" }, 204);
  await request(log, itemUrl, undefined, 404);
  assert.equal(JSON.parse(await request(log, base, undefined, 200)).length, 3);
}

async function probeNotesApi(log) {
  const base = "http://localhost:8081";
  assert.equal(await request(log, `${base}/healthz`, undefined, 200), "ok");
  assert.match(await request(log, `${base}/`, undefined, 200), /Tsonic Notes/u);
  assert.equal(JSON.parse(await request(log, `${base}/api/notes`, undefined, 200)).length, 2);
  await request(log, `${base}/api/notes`, jsonRequest("POST", "{"), 400);
  const created = JSON.parse(await request(log, `${base}/api/notes`, jsonRequest("POST", JSON.stringify({ title: "Architecture", content: "Verified" })), 201));
  const itemUrl = `${base}/api/notes/${created.id}`;
  const updated = JSON.parse(await request(log, itemUrl, jsonRequest("PUT", JSON.stringify({ title: "Architecture", content: "Airplane grade" })), 200));
  assert.equal(updated.content, "Airplane grade");
  await request(log, itemUrl, { method: "DELETE" }, 204);
  await request(log, itemUrl, undefined, 404);
}

async function probeNodeWeb(log) {
  assert.equal(await request(log, "http://localhost:8765/", undefined, 200), "Hello from Tsonic!");
}

async function probeAspNetBlog(log) {
  const base = "http://localhost:8090";
  assert.match(await request(log, `${base}/`, undefined, 200), /Tsonic Blog/u);
  assert.equal(JSON.parse(await request(log, `${base}/api/posts`, undefined, 200)).length, 1);
  await request(log, `${base}/api/posts`, jsonRequest("POST", "{"), 400);
  await request(log, `${base}/api/posts`, jsonRequest("POST", JSON.stringify({ wrong: "shape" })), 400);
  const created = JSON.parse(await request(log, `${base}/api/posts`, jsonRequest("POST", JSON.stringify({ title: "Architecture", content: "Airplane grade" })), 201));
  assert.equal(created.title, "Architecture");
  assert.equal(JSON.parse(await request(log, `${base}/api/posts`, undefined, 200)).length, 2);
}

async function probeAspNetEf(log) {
  const base = "http://localhost:8091";
  assert.deepEqual(JSON.parse(await request(log, `${base}/api/health`, undefined, 200)), { ok: true });
  assert.match(await request(log, `${base}/`, undefined, 200), /Tsonic Blog/u);
  const initial = JSON.parse(await request(log, `${base}/api/posts`, undefined, 200));
  assert.equal(initial.length, 1);
  await request(log, `${base}/api/posts`, jsonRequest("POST", "{"), 400);
  const created = JSON.parse(await request(log, `${base}/api/posts`, jsonRequest("POST", JSON.stringify({ title: "Architecture", content: "Verified" })), 201));
  const postUrl = `${base}/api/posts/${created.id}`;
  assert.equal(JSON.parse(await request(log, postUrl, undefined, 200)).title, "Architecture");
  const updated = JSON.parse(await request(log, postUrl, jsonRequest("PUT", JSON.stringify({ title: "Architecture", content: "Airplane grade" })), 200));
  assert.equal(updated.content, "Airplane grade");
  const comment = JSON.parse(await request(log, `${postUrl}/comments`, jsonRequest("POST", JSON.stringify({ author: "Reviewer", body: "Verified" })), 201));
  assert.equal(comment.body, "Verified");
  assert.equal(JSON.parse(await request(log, `${postUrl}/comments`, undefined, 200)).length, 1);
  await request(log, postUrl, { method: "DELETE" }, 204);
  await request(log, postUrl, undefined, 404);
}

function jsonRequest(method, body) {
  return { method, headers: { "content-type": "application/json" }, body };
}

async function stopServer(child) {
  if (child.exitCode !== null) return;
  const gracefulExit = waitForProcessExit(child, 5_000);
  terminateProcessGroup(child, "SIGINT");
  if (await gracefulExit) return;
  const forcedExit = waitForProcessExit(child, 5_000);
  terminateProcessGroup(child, "SIGKILL");
  assert.equal(await forcedExit, true, `Server process ${child.pid} did not terminate after SIGKILL.`);
}

function waitForProcessExit(child, timeoutMilliseconds) {
  if (child.exitCode !== null || child.signalCode !== null) return Promise.resolve(true);
  return new Promise((resolveExit) => {
    const onExit = () => {
      clearTimeout(timer);
      resolveExit(true);
    };
    const timer = setTimeout(() => {
      child.off("exit", onExit);
      resolveExit(false);
    }, timeoutMilliseconds);
    child.once("exit", onExit);
  });
}

function terminateProcessGroup(child, signal) {
  if (child.pid === undefined) return;
  try {
    process.kill(-child.pid, signal);
  } catch (error) {
    if (error?.code !== "ESRCH") throw error;
  }
}

async function verifyInventory(log) {
  const discovered = await discoverConfigs(repoRoot);
  const expected = projects.map(({ path }) => `${path}/tsonic.json`).sort();
  assert.deepEqual(discovered, expected, "Every non-temporary tsonic.json must be classified exactly once.");
  for (const item of projects) {
    const config = JSON.parse(await readFile(resolve(repoRoot, item.path, "tsonic.json"), "utf8"));
    const options = config.targets?.[0]?.options;
    assert.equal(options?.assemblyName, item.assembly, `${item.path} assembly mismatch.`);
    assert.equal(options?.outputType ?? "Library", item.kind === "library" ? "Library" : "Exe", `${item.path} output type mismatch.`);
  }
  const counts = Object.fromEntries(
    ["library", "finite", "server"].map((kind) => [kind, projects.filter((item) => item.kind === kind).length]),
  );
  queueLog(log, `PROJECT_INVENTORY=${projects.length}\nLIBRARIES=${counts.library}\nFINITE=${counts.finite}\nSERVERS=${counts.server}\n`);
}

async function discoverConfigs(root) {
  const ignored = new Set([".git", ".temp", ".tests", "node_modules", "out", "bin", "obj"]);
  const found = [];
  async function visit(directory) {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      if (entry.isDirectory() && !ignored.has(entry.name)) await visit(resolve(directory, entry.name));
      if (entry.isFile() && entry.name === "tsonic.json") found.push(relative(root, resolve(directory, entry.name)));
    }
  }
  await visit(root);
  return found.sort();
}

async function verifyLocalLinks(log) {
  const workspaces = ["bcl", "js", "nodejs", "aspnetcore", "workspaces/scoped-multi-project", "workspaces/unscoped-multi-project"];
  const links = {
    cli: resolve(local.tsonic, "packages/cli"),
    "source-core": resolve(local.tsonic, "packages/source-core"),
    "target-api": resolve(local.tsonic, "packages/target-api"),
    tsts: resolve(local.tsonic, "packages/tsts"),
    "target-csharp": local.csharp,
    "csharp-runtime": local.runtime,
    "csharp-js": local.js,
    "csharp-nodejs": local.node,
    efcore: local.efcore,
    "efcore-sqlite": local.efcoreSqlite,
  };
  for (const workspace of workspaces) {
    for (const [name, target] of Object.entries(links)) {
      const actual = await realpath(resolve(repoRoot, workspace, "node_modules/@tsonic", name));
      assert.equal(actual, await realpath(target), `${workspace} @tsonic/${name} does not point at the active local checkout.`);
    }
  }
  queueLog(log, `LOCAL_LINKS=${workspaces.length * Object.keys(links).length}\n`);
}

async function recordRepositories(log) {
  for (const [name, path] of Object.entries({ ...local, proof: repoRoot })) {
    const branch = git(path, ["branch", "--show-current"]);
    const head = git(path, ["rev-parse", "HEAD"]);
    const status = git(path, ["status", "--porcelain"]);
    queueLog(log, `REPO ${name} ${path}\nBRANCH ${branch}\nHEAD ${head}\nDIRTY ${status === "" ? "no" : "yes"}\n${status}\n`);
  }
}

async function verifyBoundedRunner(log) {
  const check = spawnSync("systemd-run", ["--user", "--scope", "--quiet", "-p", "MemoryMax=256M", "-p", "MemorySwapMax=0", "true"], { encoding: "utf8" });
  assert.equal(check.status, 0, `systemd-run memory boundary unavailable: ${check.stderr}`);
  queueLog(log, `JOBS=${jobs}\nMEMORY_BOUNDARY=systemd-run\n`);
}

async function verifyArtifacts() {
  const required = [
    tsonicBin,
    resolve(local.runtime, "runtimes/net10.0/Tsonic.CSharp.Runtime.dll"),
    resolve(local.js, "runtimes/net10.0/Tsonic.CSharp.Js.dll"),
    resolve(local.node, "runtimes/net10.0/Tsonic.CSharp.Node.dll"),
  ];
  for (const path of required) await realpath(path);
}

async function finish() {
  const ended = Date.now();
  const passed = results.filter(({ status }) => status === "passed").length;
  const failed = results.length - passed;
  let report = `PROOF_PUDDING_VERIFICATION\nRUN_ROOT=${runRoot}\nJOBS=${jobs}\nTASKS=${results.length}\nPASSED=${passed}\nFAILED=${failed}\nSTARTED_AT=${new Date(verificationStarted).toISOString()}\nFINISHED_AT=${new Date(ended).toISOString()}\nDURATION_MS=${ended - verificationStarted}\n\n`;
  for (const result of results) {
    report += `${result.status.toUpperCase()} ${result.phase} ${result.id} ${formatDuration(result.ended - result.started)}\n`;
  }
  await writeFile(reportPath, report, "utf8");
  for (const result of results) {
    await appendFile(reportPath, `\n===== ${result.id} =====\n`, "utf8");
    await appendFile(reportPath, await readFile(result.logPath), "utf8");
  }
  console.log(`Proof Pudding: ${passed}/${results.length} tasks passed; ${failed} failed.`);
  console.log(`Consolidated report: ${reportPath}`);
}

function printProgress() {
  const now = Date.now();
  const running = [...active.entries()].map(([id, started]) => `${id} (${formatDuration(now - started)})`).join(", ");
  console.log(`[progress] phase=${currentPhase} completed=${results.length} active=${active.size}${running === "" ? "" : ` :: ${running}`}`);
}

function queueLog(path, data) {
  const previous = logWrites.get(path) ?? Promise.resolve();
  const next = previous
    .then(() => appendFile(path, data))
    .catch((error) => logWriteErrors.set(path, error));
  logWrites.set(path, next);
}

async function flushLog(path) {
  await logWrites.get(path);
  const error = logWriteErrors.get(path);
  if (error !== undefined) throw error;
}

function git(cwd, args) {
  const result = spawnSync("git", args, { cwd, encoding: "utf8" });
  assert.equal(result.status, 0, `git ${args.join(" ")} failed in ${cwd}: ${result.stderr}`);
  return result.stdout.trim();
}

function renderArgument(value) {
  return /^[a-zA-Z0-9_./:=+-]+$/u.test(value) ? value : JSON.stringify(value);
}

function escapeRegExp(value) {
  return value.replaceAll(/[.*+?^${}()|[\]\\]/gu, "\\$&");
}

function formatDuration(milliseconds) {
  return `${(milliseconds / 1000).toFixed(1)}s`;
}

function sleep(milliseconds) {
  return new Promise((resolveSleep) => setTimeout(resolveSleep, milliseconds));
}
