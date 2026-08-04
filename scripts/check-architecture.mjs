import { repoRoot } from "./verify/config.mjs";
import { verifyArchitecture } from "./verify/preflight.mjs";

const result = await verifyArchitecture(repoRoot);
console.log(
  `Proof architecture: ${result.projects} projects across ${result.workspaces} workspaces; ` +
  `${result.files} source-controlled inputs inspected.`,
);
