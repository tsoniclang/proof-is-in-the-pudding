import assert from "node:assert/strict";
import {
  memoryBudgetMiB,
  projectSpecs,
  providerMaterializationAuditWorkspaces,
  repoRoot,
  workerLimit,
} from "./verify/config.mjs";
import { executeProject } from "./verify/projects.mjs";
import {
  buildPrerequisites,
  createFreshStage,
  installStagedWorkspaces,
  packExactPackages,
  verifyArchitecture,
  verifyRepositoryInputs,
  verifySystemdBoundary,
} from "./verify/preflight.mjs";
import { allocateServerPorts } from "./verify/probes.mjs";
import { verifyIncrementalProviderCaches } from "./verify/provider-materialization.mjs";
import {
  cleanupTransientUnits,
  createRunContext,
  recoverOrphanedProofUnits,
  recordEvidence,
  runLoggedTask,
  runTaskGraph,
  startProgressTimer,
  writeConsolidatedReport,
} from "./verify/runner.mjs";

const context = await createRunContext(repoRoot, workerLimit, memoryBudgetMiB);
recoverOrphanedProofUnits(context);
const progressTimer = startProgressTimer(context);
let signalHandling = false;
let fatalError;

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.once(signal, async () => {
    if (signalHandling) return;
    signalHandling = true;
    recordEvidence(context, `INTERRUPTED signal=${signal}`);
    await cleanupTransientUnits(context);
    await writeConsolidatedReport(context, projectSpecs.length);
    process.exit(signal === "SIGINT" ? 130 : 143);
  });
}

try {
  const architecture = await runLoggedTask(context, "architecture-contract", async () => {
    const counts = await verifyArchitecture();
    recordEvidence(
      context,
      `ARCHITECTURE files=${counts.files} workspaces=${counts.workspaces} projects=${counts.projects}`,
    );
    await verifyRepositoryInputs(context);
  });
  assert.equal(architecture.status, "passed", "Architecture preflight failed.");

  await verifySystemdBoundary(context);
  assert.equal(context.results.at(-1).status, "passed", "Resource-boundary preflight failed.");

  await buildPrerequisites(context);
  assert.equal(
    context.results.filter(({ id }) => id.startsWith("build-")).every(({ status }) => status === "passed"),
    true,
    "A prerequisite build failed.",
  );

  const artifacts = await packExactPackages(context);
  const staged = await runLoggedTask(context, "stage-fresh-proof-source", () => createFreshStage(context));
  assert.equal(staged.status, "passed", "Fresh source staging failed.");
  await installStagedWorkspaces(context, artifacts);

  const serverPorts = await allocateServerPorts(projectSpecs);
  for (const [id, port] of serverPorts) recordEvidence(context, `SERVER_PORT ${id} ${port}`);
  await runTaskGraph(
    context,
    projectSpecs,
    (task, project) => executeProject(context, task, project, serverPorts),
  );
  const providerMaterialization = await runLoggedTask(
    context,
    "provider-materialization-contract",
    () => verifyIncrementalProviderCaches(context, providerMaterializationAuditWorkspaces),
  );
  assert.equal(providerMaterialization.status, "passed", "Provider materialization contract failed.");
} catch (error) {
  fatalError = error instanceof Error ? error.stack ?? error.message : String(error);
  recordEvidence(context, `FATAL ${fatalError.replaceAll("\n", " | ")}`);
} finally {
  clearInterval(progressTimer);
  await cleanupTransientUnits(context);
}

const report = await writeConsolidatedReport(context, projectSpecs.length);
if (
  fatalError !== undefined ||
  report.failed !== 0 ||
  report.projectResults !== projectSpecs.length
) {
  process.exitCode = 1;
}
