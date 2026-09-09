import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { localRepositories, projectSpecs, repoRoot } from "./config.mjs";

const tooling = await import(pathToFileURL(resolve(localRepositories.tsonic, "test/scripts/proof-scenarios.mjs")).href);
export const { createScenarioReport, inspectScenarioArguments, summarizeScenarioReport } = tooling;

export async function loadScenarios(root, projectFiles) {
  const manifest = JSON.parse(await readFile(resolve(root, "scripts/verify/scenarios.json"), "utf8"));
  assert.equal(manifest.suite, "csharp");
  return tooling.validateScenarios({
    root,
    manifest,
    projectFiles,
    inputFiles: ["scripts/verify/scenarios.json", "scripts/verify/config.mjs", "scripts/verify/projects.mjs", "scripts/verify/probes.mjs"],
    projects: projectSpecs.map((project) => ({ ...project, execution: project.kind === "library" ? "compile-only" : "runtime" })),
  });
}

export async function inspectScenarios() {
  const { verifyArchitecture } = await import("./preflight.mjs");
  return (await verifyArchitecture(repoRoot)).scenarios;
}
