import { Console } from "@tsonic/dotnet/System.js";
import * as path from "node:path";
import * as process from "node:process";

export function main(): void {
  Console.WriteLine("=== Environment Info ===");
  Console.WriteLine("");
  Console.WriteLine("Current directory: " + process.cwd());
  Console.WriteLine("Platform: " + process.platform);
  Console.WriteLine("Architecture: " + process.arch);
  Console.WriteLine("Node version: " + process.version);
  Console.WriteLine("PID: " + process.pid);
  Console.WriteLine("");
  Console.WriteLine("=== Path Operations ===");
  Console.WriteLine("");

  const testPath = "/home/user/documents/file.txt";
  Console.WriteLine("Test path: " + testPath);
  Console.WriteLine("Basename: " + path.basename(testPath));
  Console.WriteLine("Dirname: " + path.dirname(testPath));
  Console.WriteLine("Extension: " + path.extname(testPath));

  const joined = path.join("home", "user", "docs");
  Console.WriteLine("Joined path: " + joined);
}

main();
