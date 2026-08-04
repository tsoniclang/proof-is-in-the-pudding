import assert from "node:assert/strict";
import { spawn, spawnSync } from "node:child_process";
import { appendFile, mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const commandOutputLimit = 64 * 1024 * 1024;
const metricPrefix = "PROOF_TIME|";

export async function createRunContext(repoRoot, workerLimit, memoryBudgetMiB) {
  const stamp = new Date().toISOString().replaceAll(/[:.]/gu, "-");
  const runId = `${stamp}-${process.pid}`;
  const runRoot = resolve(repoRoot, ".tests", `verify-${runId}`);
  const context = {
    repoRoot,
    runId,
    runRoot,
    logRoot: resolve(runRoot, "logs"),
    stageRoot: resolve(runRoot, "workspace"),
    packageRoot: resolve(runRoot, "packages"),
    nugetPackages: process.env.NUGET_PACKAGES ?? resolve(runRoot, "nuget-packages"),
    reportPath: resolve(runRoot, "report.log"),
    workerLimit,
    memoryBudgetMiB,
    started: Date.now(),
    results: [],
    activeTasks: new Map(),
    activeUnits: new Set(),
    evidence: [],
    commandSequence: 0,
    schedulerMemoryMiB: 0,
  };
  await mkdir(context.logRoot, { recursive: true });
  await mkdir(context.packageRoot, { recursive: true });
  await mkdir(context.nugetPackages, { recursive: true });
  return context;
}

export function recordEvidence(context, line) {
  context.evidence.push(line);
}

export function startProgressTimer(context) {
  const timer = setInterval(() => {
    const now = Date.now();
    const active = [...context.activeTasks.entries()]
      .map(([id, started]) => `${id} (${formatDuration(now - started)})`)
      .join(", ");
    console.log(
      `[progress] completed=${context.results.length} active=${context.activeTasks.size} ` +
      `memory=${context.schedulerMemoryMiB}/${context.memoryBudgetMiB}MiB` +
      (active === "" ? "" : ` :: ${active}`),
    );
  }, 180_000);
  timer.unref();
  return timer;
}

export async function runLoggedTask(context, id, action) {
  const logPath = resolve(context.logRoot, `${safeName(id)}.log`);
  const started = Date.now();
  const task = { id, logPath, commands: [] };
  context.activeTasks.set(id, started);
  console.log(`[start] ${id}`);
  await writeFile(
    logPath,
    `TASK=${id}\nSTARTED_AT=${new Date(started).toISOString()}\n`,
    "utf8",
  );
  let status = "passed";
  let error;
  try {
    await action(task);
  } catch (caught) {
    status = "failed";
    error = caught instanceof Error ? caught.stack ?? caught.message : String(caught);
    await appendFile(logPath, `\nERROR\n${error}\n`, "utf8");
  }
  const ended = Date.now();
  await appendFile(
    logPath,
    `\nSTATUS=${status}\nFINISHED_AT=${new Date(ended).toISOString()}\nDURATION_MS=${ended - started}\n`,
    "utf8",
  );
  const result = { id, status, error, logPath, commands: task.commands, started, ended };
  context.results.push(result);
  context.activeTasks.delete(id);
  console.log(`[${status}] ${id} :: ${formatDuration(ended - started)}`);
  return result;
}

export async function runCommand(context, task, spec) {
  const unit = nextUnitName(context, spec.id);
  const metricFormat = `${metricPrefix}elapsed=%e|user=%U|system=%S|cpu=%P|max_rss_kib=%M|exit=%x`;
  const args = [
    "--user",
    "--scope",
    "--quiet",
    `--unit=${unit}`,
    "-p",
    `MemoryMax=${spec.memoryMiB}M`,
    "-p",
    "MemorySwapMax=0",
    "/usr/bin/time",
    `--format=${metricFormat}`,
    spec.executable,
    ...spec.args,
  ];
  await appendFile(
    task.logPath,
    `\n===== COMMAND ${spec.id} =====\nCWD=${spec.cwd}\nMEMORY_MAX_MIB=${spec.memoryMiB}\nTIMEOUT_MINUTES=${spec.timeoutMinutes}\nCOMMAND=${renderCommand("systemd-run", args)}\n`,
    "utf8",
  );
  const managed = startManagedProcess(context, unit, args, spec);
  const timeout = setTimeout(() => managed.forceTerminate("timeout"), spec.timeoutMinutes * 60_000);
  const outcome = await managed.closed;
  clearTimeout(timeout);
  await appendCommandOutput(task.logPath, outcome);
  const metrics = parseMetrics(outcome.stderr);
  const record = {
    id: spec.id,
    status: outcome.code === 0 && outcome.signal === null && outcome.terminationReason === undefined ? "passed" : "failed",
    metrics,
    code: outcome.code,
    signal: outcome.signal,
  };
  task.commands.push(record);
  assert.equal(outcome.overflow, false, `${spec.id} exceeded the ${commandOutputLimit}-byte output limit.`);
  assert.equal(outcome.terminationReason, undefined, `${spec.id} was terminated: ${outcome.terminationReason}.`);
  assert.equal(outcome.signal, null, `${spec.id} terminated by ${outcome.signal}.`);
  assert.equal(outcome.code, 0, `${spec.id} exited with code ${outcome.code}.`);
  assert.notEqual(metrics, undefined, `${spec.id} did not emit resource metrics.`);
  return { stdout: outcome.stdout, stderr: outcome.stderr, metrics };
}

export async function startServer(context, task, spec) {
  const started = Date.now();
  const unit = nextUnitName(context, spec.id);
  const metricFormat = `${metricPrefix}elapsed=%e|user=%U|system=%S|cpu=%P|max_rss_kib=%M|exit=%x`;
  const args = [
    "--user",
    "--scope",
    "--quiet",
    `--unit=${unit}`,
    "-p",
    `MemoryMax=${spec.memoryMiB}M`,
    "-p",
    "MemorySwapMax=0",
    "/usr/bin/time",
    `--format=${metricFormat}`,
    spec.executable,
    ...spec.args,
  ];
  await appendFile(
    task.logPath,
    `\n===== SERVER ${spec.id} =====\nCWD=${spec.cwd}\nMEMORY_MAX_MIB=${spec.memoryMiB}\nCOMMAND=${renderCommand("systemd-run", args)}\n`,
    "utf8",
  );
  const managed = startManagedProcess(context, unit, args, spec);
  const hardTimeout = setTimeout(() => managed.forceTerminate("server hard timeout"), spec.timeoutMinutes * 60_000);
  let stopped = false;
  return {
    child: managed.child,
    output: () => managed.output(),
    async stop() {
      if (stopped) return;
      stopped = true;
      clearTimeout(hardTimeout);
      const unitMetrics = readUnitMetrics(unit, started);
      managed.requestStop("requested server shutdown");
      let outcome = await Promise.race([
        managed.closed,
        new Promise((resolveTimeout) => setTimeout(() => resolveTimeout(undefined), 10_000)),
      ]);
      if (outcome === undefined) {
        managed.forceTerminate("server did not stop within 10 seconds");
        outcome = await managed.closed;
      }
      await appendCommandOutput(task.logPath, outcome);
      const metrics = unitMetrics ?? parseMetrics(outcome.stderr);
      task.commands.push({
        id: spec.id,
        status: outcome.overflow || metrics === undefined ? "failed" : "passed",
        metrics,
        code: outcome.code,
        signal: outcome.signal,
      });
      assert.equal(outcome.overflow, false, `${spec.id} exceeded the ${commandOutputLimit}-byte output limit.`);
      assert.notEqual(metrics, undefined, `${spec.id} did not emit resource metrics.`);
    },
  };
}

export async function runTaskGraph(context, items, execute) {
  const pending = new Map(items.map((item) => [item.id, item]));
  const completed = new Map();
  const running = new Map();
  for (const item of items) {
    assert(item.memoryMiB <= context.memoryBudgetMiB, `${item.id} exceeds the global memory budget.`);
    for (const dependency of item.dependencies) {
      assert(items.some(({ id }) => id === dependency), `${item.id} has unknown dependency ${dependency}.`);
    }
  }

  while (pending.size > 0 || running.size > 0) {
    let started = false;
    for (const item of items) {
      if (!pending.has(item.id)) continue;
      if (!item.dependencies.every((dependency) => completed.has(dependency))) continue;
      const failedDependency = item.dependencies.find((dependency) => completed.get(dependency) !== "passed");
      if (failedDependency !== undefined) {
        pending.delete(item.id);
        const result = await runLoggedTask(context, `project-${item.id}`, async () => {
          assert.fail(`Dependency ${failedDependency} did not pass.`);
        });
        completed.set(item.id, result.status);
        started = true;
        continue;
      }
      if (running.size >= context.workerLimit) continue;
      if (context.schedulerMemoryMiB + item.memoryMiB > context.memoryBudgetMiB) continue;
      pending.delete(item.id);
      context.schedulerMemoryMiB += item.memoryMiB;
      const promise = runLoggedTask(context, `project-${item.id}`, (task) => execute(task, item))
        .then((result) => completed.set(item.id, result.status))
        .finally(() => {
          context.schedulerMemoryMiB -= item.memoryMiB;
          running.delete(item.id);
        });
      running.set(item.id, promise);
      started = true;
    }
    if (running.size > 0) {
      await Promise.race(running.values());
    } else if (!started && pending.size > 0) {
      assert.fail(`Project graph cannot make progress: ${[...pending.keys()].join(", ")}.`);
    }
  }
  return completed;
}

export async function cleanupTransientUnits(context) {
  for (const unit of [...context.activeUnits]) stopUnit(unit);
  context.activeUnits.clear();
}

export async function writeConsolidatedReport(context, expectedProjectCount) {
  const ended = Date.now();
  const passed = context.results.filter(({ status }) => status === "passed").length;
  const failed = context.results.length - passed;
  const projectResults = context.results.filter(({ id }) => id.startsWith("project-"));
  let report = [
    "PROOF_PUDDING_VERIFICATION",
    `RUN_ROOT=${context.runRoot}`,
    `WORKERS=${context.workerLimit}`,
    `MEMORY_BUDGET_MIB=${context.memoryBudgetMiB}`,
    `TASKS=${context.results.length}`,
    `PASSED=${passed}`,
    `FAILED=${failed}`,
    `EXPECTED_PROJECTS=${expectedProjectCount}`,
    `COMPLETED_PROJECTS=${projectResults.length}`,
    "SKIPPED=0",
    "TODO=0",
    `STARTED_AT=${new Date(context.started).toISOString()}`,
    `FINISHED_AT=${new Date(ended).toISOString()}`,
    `DURATION_MS=${ended - context.started}`,
    "",
    ...context.evidence,
    "",
    "TASK_SUMMARY",
  ].join("\n");
  for (const result of [...context.results].sort((left, right) => left.id.localeCompare(right.id))) {
    report += `\n${result.status.toUpperCase()} ${result.id} ${formatDuration(result.ended - result.started)}`;
    for (const command of result.commands) {
      const metrics = command.metrics;
      report += metrics === undefined
        ? `\n  COMMAND ${command.id} metrics=missing`
        : `\n  COMMAND ${command.id} elapsed=${metrics.elapsedSeconds}s cpu=${metrics.cpuPercent}% max_rss=${metrics.maxRssKiB}KiB`;
    }
  }
  report += "\n";
  await writeFile(context.reportPath, report, "utf8");
  for (const result of [...context.results].sort((left, right) => left.id.localeCompare(right.id))) {
    await appendFile(context.reportPath, `\n===== ${result.id} =====\n`, "utf8");
    await appendFile(context.reportPath, await readFile(result.logPath), "utf8");
  }
  console.log(`Proof Pudding: ${passed}/${context.results.length} tasks passed; ${failed} failed.`);
  console.log(`Consolidated report: ${context.reportPath}`);
  return { passed, failed, projectResults: projectResults.length };
}

function startManagedProcess(context, unit, args, spec) {
  const stdout = createCollector();
  const stderr = createCollector();
  let terminationReason;
  let overflow = false;
  const child = spawn("systemd-run", args, {
    cwd: spec.cwd,
    env: { ...process.env, ...spec.environment },
    detached: true,
    stdio: ["ignore", "pipe", "pipe"],
  });
  context.activeUnits.add(unit);
  const onData = (collector) => (chunk) => {
    if (!collector.append(chunk)) {
      overflow = true;
      forceTerminate("output limit exceeded");
    }
  };
  child.stdout.on("data", onData(stdout));
  child.stderr.on("data", onData(stderr));
  const closed = new Promise((resolveClosed, rejectClosed) => {
    child.once("error", rejectClosed);
    child.once("close", (code, signal) => {
      context.activeUnits.delete(unit);
      resetUnit(unit);
      resolveClosed({
        code,
        signal,
        stdout: stdout.text(),
        stderr: stderr.text(),
        overflow,
        terminationReason,
      });
    });
  });
  function requestStop(reason) {
    if (terminationReason === undefined) terminationReason = reason;
    stopUnit(unit);
  }
  function forceTerminate(reason) {
    requestStop(reason);
    if (child.exitCode === null) {
      try {
        process.kill(-child.pid, "SIGKILL");
      } catch (error) {
        if (error?.code !== "ESRCH") throw error;
      }
    }
  }
  return {
    child,
    closed,
    requestStop,
    forceTerminate,
    output: () => `${stdout.text()}\n${stderr.text()}`,
  };
}

function createCollector() {
  const chunks = [];
  let size = 0;
  return {
    append(chunk) {
      size += chunk.length;
      if (size > commandOutputLimit) return false;
      chunks.push(chunk);
      return true;
    },
    text() {
      return Buffer.concat(chunks).toString("utf8");
    },
  };
}

async function appendCommandOutput(logPath, outcome) {
  await appendFile(
    logPath,
    `\n--- STDOUT ---\n${outcome.stdout}\n--- STDERR ---\n${outcome.stderr}` +
    `\n--- OUTCOME ---\nCODE=${outcome.code}\nSIGNAL=${outcome.signal ?? "none"}\n` +
    `TERMINATION=${outcome.terminationReason ?? "none"}\nOUTPUT_OVERFLOW=${outcome.overflow ? "yes" : "no"}\n`,
    "utf8",
  );
}

function parseMetrics(stderr) {
  const line = stderr.split(/\r?\n/u).find((candidate) => candidate.startsWith(metricPrefix));
  if (line === undefined) return undefined;
  const values = Object.fromEntries(
    line.slice(metricPrefix.length).split("|").map((part) => {
      const index = part.indexOf("=");
      return [part.slice(0, index), part.slice(index + 1)];
    }),
  );
  return {
    elapsedSeconds: Number.parseFloat(values.elapsed),
    userSeconds: Number.parseFloat(values.user),
    systemSeconds: Number.parseFloat(values.system),
    cpuPercent: Number.parseFloat(values.cpu.replace("%", "")),
    maxRssKiB: Number.parseInt(values.max_rss_kib, 10),
    exitStatus: Number.parseInt(values.exit, 10),
  };
}

function nextUnitName(context, id) {
  context.commandSequence += 1;
  return `proof-pudding-${process.pid}-${context.commandSequence}-${safeName(id)}`.slice(0, 80);
}

function safeName(value) {
  return value.replaceAll(/[^a-zA-Z0-9_.-]/gu, "-");
}

function stopUnit(unit) {
  spawnSync("systemctl", ["--user", "stop", `${unit}.scope`], { encoding: "utf8" });
}

function resetUnit(unit) {
  spawnSync("systemctl", ["--user", "reset-failed", `${unit}.scope`], { encoding: "utf8" });
}

function readUnitMetrics(unit, started) {
  const result = spawnSync(
    "systemctl",
    ["--user", "show", `${unit}.scope`, "--property=MemoryPeak", "--property=CPUUsageNSec"],
    { encoding: "utf8" },
  );
  if (result.status !== 0) return undefined;
  const values = Object.fromEntries(
    result.stdout.trim().split(/\r?\n/u).map((line) => {
      const index = line.indexOf("=");
      return [line.slice(0, index), line.slice(index + 1)];
    }),
  );
  const memoryBytes = Number.parseInt(values.MemoryPeak, 10);
  const cpuNanoseconds = Number.parseInt(values.CPUUsageNSec, 10);
  if (!Number.isSafeInteger(memoryBytes) || !Number.isSafeInteger(cpuNanoseconds)) return undefined;
  const elapsedSeconds = (Date.now() - started) / 1000;
  return {
    elapsedSeconds,
    userSeconds: undefined,
    systemSeconds: undefined,
    cpuPercent: elapsedSeconds === 0 ? 0 : (cpuNanoseconds / 1_000_000_000 / elapsedSeconds) * 100,
    maxRssKiB: Math.ceil(memoryBytes / 1024),
    exitStatus: undefined,
  };
}

function renderCommand(executable, args) {
  return [executable, ...args]
    .map((value) => (/^[a-zA-Z0-9_./:=+%,-]+$/u.test(value) ? value : JSON.stringify(value)))
    .join(" ");
}

function formatDuration(milliseconds) {
  return `${(milliseconds / 1000).toFixed(1)}s`;
}
