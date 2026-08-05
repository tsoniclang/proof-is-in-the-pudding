import { readdir, readFile } from "node:fs/promises";

export async function main(): Promise<void> {
  const files = await readdir(".");
  console.log("Fixture present:", files.includes("fixture.txt"));
  const content = await readFile("./fixture.txt", "utf8");
  console.log("Fixture content:", content.trim());
}

await main();
