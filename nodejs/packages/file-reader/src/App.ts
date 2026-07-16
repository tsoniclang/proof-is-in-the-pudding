import { readdir, readFile } from "node:fs/promises";

export async function main(): Promise<void> {
  console.log("Reading current directory...");

  const files = await readdir(".");
  console.log("Files:", files);

  console.log("\nReading README.md...");
  const content = await readFile("./README.md", "utf8");
  console.log(content);
}
