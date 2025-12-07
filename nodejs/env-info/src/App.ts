import { process, path } from "@tsonic/nodejs/nodejs.js";

export function main(): void {
  console.log("=== Environment Info ===\n");

  console.log("Current directory:", process.cwd());
  console.log("Platform:", process.platform);
  console.log("Architecture:", process.arch);
  console.log("Node version:", process.version);
  console.log("PID:", process.pid);

  console.log("\n=== Path Operations ===\n");

  const testPath = "/home/user/documents/file.txt";
  console.log("Test path:", testPath);
  console.log("Basename:", path.basename(testPath));
  console.log("Dirname:", path.dirname(testPath));
  console.log("Extension:", path.extname(testPath));

  const joined = path.join("home", "user", "docs");
  console.log("Joined path:", joined);
}
