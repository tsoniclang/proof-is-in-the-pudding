import { Console } from "@tsonic/dotnet/System.js";
import { Parallel } from "@tsonic/dotnet/System.Threading.Tasks.js";
import { long } from "@tsonic/core/types.js";

export function main(): void {
  Console.writeLine("=== Parallel Computation Test (js mode - dotnet runtime) ===");
  Console.writeLine("");

  const iterations = 100000;
  Console.writeLine(`Running 3 workers in PARALLEL with ${iterations} iterations each...`);
  Console.writeLine("");

  // Results array to capture values from parallel workers (long for large sums)
  const results: long[] = [0, 0, 0];

  // Run all three computations in parallel using Parallel.invoke
  Parallel.invoke(
    () => {
      Console.writeLine("Worker 1 starting on thread...");
      let sum: long = 0;
      for (let i = 0; i < iterations; i++) {
        sum += i;
      }
      Console.writeLine(`Worker 1 done. Sum: ${sum}`);
      results[0] = sum;
    },
    () => {
      Console.writeLine("Worker 2 starting on thread...");
      let sum: long = 0;
      for (let i = 0; i < iterations; i++) {
        sum += i;
      }
      Console.writeLine(`Worker 2 done. Sum: ${sum}`);
      results[1] = sum;
    },
    () => {
      Console.writeLine("Worker 3 starting on thread...");
      let sum: long = 0;
      for (let i = 0; i < iterations; i++) {
        sum += i;
      }
      Console.writeLine(`Worker 3 done. Sum: ${sum}`);
      results[2] = sum;
    }
  );

  Console.writeLine("");
  Console.writeLine("=== Results ===");
  Console.writeLine(`Worker 1: ${results[0]}`);
  Console.writeLine(`Worker 2: ${results[1]}`);
  Console.writeLine(`Worker 3: ${results[2]}`);
  Console.writeLine(`Total: ${results[0] + results[1] + results[2]}`);
}
