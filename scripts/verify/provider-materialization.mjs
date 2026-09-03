import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { resolve } from "node:path";
import { recordEvidence } from "./runner.mjs";

const exactSelectorFields = [
  "requestedExports",
  "requestedTargetIds",
  "requestedMetadataNames",
];

export async function verifyIncrementalProviderCaches(context, projectPaths) {
  for (const projectPath of projectPaths) {
    const cacheRoot = resolve(
      context.stageRoot,
      projectPath,
      ".tsonic/cache/csharp/dotnet-reflection",
    );
    const cacheFiles = (await readdir(cacheRoot))
      .filter((fileName) => fileName.endsWith(".json"))
      .sort();
    assert.notEqual(cacheFiles.length, 0, `${projectPath} produced no .NET provider cache evidence.`);

    let completedExports = 0;
    let selectedExports = 0;
    for (const fileName of cacheFiles) {
      const record = JSON.parse(await readFile(resolve(cacheRoot, fileName), "utf8"));
      const request = record.request;
      assert.equal(
        request?.materialization?.kind,
        "incremental",
        `${projectPath}/${fileName} used complete provider materialization.`,
      );
      const selectorCount = exactSelectorFields.reduce(
        (count, field) => count + (Array.isArray(request[field]) ? request[field].length : 0),
        0,
      );
      assert.notEqual(selectorCount, 0, `${projectPath}/${fileName} is a broad provider request.`);
      selectedExports += selectorCount;

      const demands = request.materialization.completeExports;
      assert.equal(Array.isArray(demands), true, `${projectPath}/${fileName} has no exact export-demand list.`);
      const demandKeys = demands.map((demand) => {
        assert.equal(typeof demand.exportName, "string", `${projectPath}/${fileName} has an invalid export demand.`);
        assert.notEqual(demand.exportName.length, 0, `${projectPath}/${fileName} has an empty export demand.`);
        if (demand.exportId !== undefined) {
          assert.equal(typeof demand.exportId, "string", `${projectPath}/${fileName} has an invalid export id.`);
          assert.notEqual(demand.exportId.length, 0, `${projectPath}/${fileName} has an empty export id.`);
        }
        return `${demand.exportName}\u0000${demand.exportId ?? ""}`;
      });
      assert.deepEqual(
        demandKeys,
        [...new Set(demandKeys)].sort(),
        `${projectPath}/${fileName} has duplicate or non-canonical export demands.`,
      );
      completedExports += demands.length;
    }

    recordEvidence(
      context,
      `PROVIDER_MATERIALIZATION project=${projectPath} records=${cacheFiles.length} ` +
      `kind=incremental broad=0 selected=${selectedExports} completed=${completedExports}`,
    );
  }
}
