import { Console } from "@tsonic/dotnet/System.js";
import { Parallel } from "@tsonic/dotnet/System.Threading.Tasks.js";
import { long } from "@tsonic/core/types.js";

export function main(): void {
  Console.WriteLine("=== Parallel Computation Test (JSRuntime bindings) ===");
  Console.WriteLine("");

  const iterations = 100000;
  Console.WriteLine(`Running 3 workers in PARALLEL with ${iterations} iterations each...`);
  Console.WriteLine("");

  // Results array to capture values from parallel workers (long for large sums)
  const results: long[] = [0, 0, 0];

  // Run all three computations in parallel using Parallel.Invoke
  Parallel.Invoke(
    () => {
      Console.WriteLine("Worker 1 starting on thread...");
      let sum: long = 0;
      for (let i = 0; i < iterations; i++) {
        sum += i;
      }
      Console.WriteLine(`Worker 1 done. Sum: ${sum}`);
      results[0] = sum;
    },
    () => {
      Console.WriteLine("Worker 2 starting on thread...");
      let sum: long = 0;
      for (let i = 0; i < iterations; i++) {
        sum += i;
      }
      Console.WriteLine(`Worker 2 done. Sum: ${sum}`);
      results[1] = sum;
    },
    () => {
      Console.WriteLine("Worker 3 starting on thread...");
      let sum: long = 0;
      for (let i = 0; i < iterations; i++) {
        sum += i;
      }
      Console.WriteLine(`Worker 3 done. Sum: ${sum}`);
      results[2] = sum;
    }
  );

  Console.WriteLine("");
  Console.WriteLine("=== Results ===");
  Console.WriteLine(`Worker 1: ${results[0]}`);
  Console.WriteLine(`Worker 2: ${results[1]}`);
  Console.WriteLine(`Worker 3: ${results[2]}`);
  Console.WriteLine(`Total: ${results[0] + results[1] + results[2]}`);
}
