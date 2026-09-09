import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import test from "node:test";
import { projectSpecs, repoRoot } from "./config.mjs";
import { assertFiniteOutput } from "./probes.mjs";
import { writeConsolidatedReport } from "./runner.mjs";
import { createScenarioReport, inspectScenarios } from "./scenarios.mjs";

const inventory = await inspectScenarios();

test("all configured projects have source-backed scenarios or explicit executable consumers", () => {
  assert.deepEqual(inventory.projects.map(({ id }) => id), projectSpecs.map(({ id }) => id).sort());
  for (const project of projectSpecs.filter(({ kind }) => kind === "library")) {
    assert.equal(inventory.projects.find(({ id }) => id === project.id).execution, "compile-only");
    assert(inventory.scenarios.some(({ proofs }) => proofs.some(({ requires }) => requires.includes(project.id))));
  }
  assert(inventory.evidenceFiles.some(({ file }) => file === "scripts/verify/probes.mjs"));
});

test("native contracts and unmatched Node/workspace behavior remain distinct from declared pairs", () => {
  const scenario = (id) => inventory.scenarios.find((entry) => entry.id === id);
  assert.equal(scenario("node/fs/read-text-async").classification, "unpaired");
  assert.equal(scenario("node/fs/readdir-async").proofs[0].project, "node-file-reader");
  assert.equal(scenario("node/path-decompose-and-join").classification, "paired");
  assert.equal(scenario("dotnet/ef-sqlite-blog-crud").classification, "native-only");
  assert.equal(scenario("workspace/unscoped-todo-toggle").classification, "unpaired");
  assert.equal(scenario("js/regexp/callback-arguments-and-matchall-captures").classification, "unpaired");
  for (const proof of scenario("dotnet/native-aot-execution").proofs) {
    assert.equal(projectSpecs.find(({ id }) => id === proof.project).nativeAot, true);
  }
});

test("file-reader and regex metadata refer to failure-enforcing finite-output oracles", () => {
  const reader = projectSpecs.find(({ id }) => id === "node-file-reader");
  assertFiniteOutput(reader, "Fixture present: true\nFixture content: proof-file-reader-fixture\n");
  assert.throws(() => assertFiniteOutput(reader, "Fixture present: false\nFixture content: proof-file-reader-fixture\n"));
  const regex = projectSpecs.find(({ id }) => id === "js-regexp-complete");
  assertFiniteOutput(regex, "regexp-complete\n");
  assert.throws(() => assertFiniteOutput(regex, "regexp-failure:RegExp call identity\nregexp-complete\n"));
});

test("consolidated reports use the preflight snapshot and exact local project statuses", async () => {
  const scratch = resolve(repoRoot, ".temp/scenario-report-tests");
  await mkdir(scratch, { recursive: true });
  const runRoot = await mkdtemp(resolve(scratch, "case-"));
  const logPath = resolve(runRoot, "task.log");
  await writeFile(logPath, "fixture task log\n");
  const context = {
    runRoot, reportPath: resolve(runRoot, "report.log"), workerLimit: 1, memoryBudgetMiB: 1024,
    started: 0, evidence: [], scenarios: inventory,
    results: [{ id: "project-node-file-reader", status: "passed", commands: [], started: 0, ended: 1, logPath }],
  };
  await writeConsolidatedReport(context, projectSpecs.length);
  const report = JSON.parse(await readFile(resolve(runRoot, "scenarios.json"), "utf8"));
  assert.deepEqual(report, createScenarioReport(inventory, context.results));
  const reader = report.scenarios.find(({ id }) => id === "node/fs/read-text-async").proofs[0];
  assert.equal(reader.execution, "passed");
  assert.equal(reader.verification, "asserted");
  const scoped = report.scenarios.find(({ id }) => id === "workspace/scoped-todo-toggle").proofs[0];
  assert.equal(scoped.execution, "not-run");
  assert.deepEqual(scoped.tasks.find(({ id }) => id === "project-scoped-domain"), { id: "project-scoped-domain", mode: "compile-only", status: "not-run" });
  const log = await readFile(context.reportPath, "utf8");
  assert(log.includes(`SCENARIO_REPORT=${resolve(runRoot, "scenarios.json")}\n`));
  assert(!log.includes(JSON.stringify(report, null, 2)));
});
