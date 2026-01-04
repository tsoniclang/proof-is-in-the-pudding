import { console, fs } from "@tsonic/nodejs/index.js";

export async function main(): Promise<void> {
  console.log("Reading current directory...");

  const files = await fs.readdir(".");
  console.log("Files:", files);

  console.log("\nReading README.md...");
  const content = await fs.readFile("./README.md", "utf8");
  console.log(content);
}
