import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { resolve } from "node:path";
import { recordEvidence } from "./runner.mjs";

const exactSelectorFields = [
  "requestedExports",
  "requestedTargetIds",
  "requestedMetadataNames",
];

export async function verifyIncrementalProviderCaches(context, workspacePaths) {
  for (const workspacePath of workspacePaths) {
    const cacheRoot = resolve(
      context.stageRoot,
      workspacePath,
      "node_modules/@tsonic/target-csharp/.temp/provider-cache/dotnet-reflection",
    );
    const cacheFiles = (await readdir(cacheRoot))
      .filter((fileName) => fileName.endsWith(".json"))
      .sort();
    assert.notEqual(cacheFiles.length, 0, `${workspacePath} produced no .NET provider cache evidence.`);

    let completedExports = 0;
    let selectedExports = 0;
    for (const fileName of cacheFiles) {
      const record = JSON.parse(await readFile(resolve(cacheRoot, fileName), "utf8"));
      const request = record.request;
      assert.equal(
        request?.materialization?.kind,
        "incremental",
        `${workspacePath}/${fileName} used complete provider materialization.`,
      );
      const selectorCount = exactSelectorFields.reduce(
        (count, field) => count + (Array.isArray(request[field]) ? request[field].length : 0),
        0,
      );
      assert.notEqual(selectorCount, 0, `${workspacePath}/${fileName} is a broad provider request.`);
      selectedExports += selectorCount;

      const demands = request.materialization.completeExports;
      assert.equal(Array.isArray(demands), true, `${workspacePath}/${fileName} has no exact export-demand list.`);
      const demandKeys = demands.map((demand) => {
        assert.equal(typeof demand.exportName, "string", `${workspacePath}/${fileName} has an invalid export demand.`);
        assert.notEqual(demand.exportName.length, 0, `${workspacePath}/${fileName} has an empty export demand.`);
        if (demand.exportId !== undefined) {
          assert.equal(typeof demand.exportId, "string", `${workspacePath}/${fileName} has an invalid export id.`);
          assert.notEqual(demand.exportId.length, 0, `${workspacePath}/${fileName} has an empty export id.`);
        }
        return `${demand.exportName}\u0000${demand.exportId ?? ""}`;
      });
      assert.deepEqual(
        demandKeys,
        [...new Set(demandKeys)].sort(),
        `${workspacePath}/${fileName} has duplicate or non-canonical export demands.`,
      );
      completedExports += demands.length;
    }

    recordEvidence(
      context,
      `PROVIDER_MATERIALIZATION workspace=${workspacePath} records=${cacheFiles.length} ` +
      `kind=incremental broad=0 selected=${selectedExports} completed=${completedExports}`,
    );
  }
}
