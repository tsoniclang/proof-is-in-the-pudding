import { Console, Environment } from "@tsonic/dotnet/System";

function computeSum(id: number, iterations: number): number {
  Console.writeLine(`Worker ${id} starting...`);
  let sum = 0;
  for (let i = 0; i < iterations; i++) {
    sum += i;
  }
  Console.writeLine(`Worker ${id} done. Sum: ${sum}`);
  return sum;
}

export function main(): void {
  Console.writeLine("=== Parallel Computation Test (dotnet mode) ===");
  Console.writeLine("");
  Console.writeLine(`Processors: ${Environment.processorCount}`);
  Console.writeLine("");

  const iterations = 100000;
  Console.writeLine(`Running 3 workers with ${iterations} iterations each...`);
  Console.writeLine("");

  const result1 = computeSum(1, iterations);
  const result2 = computeSum(2, iterations);
  const result3 = computeSum(3, iterations);

  Console.writeLine("");
  Console.writeLine("=== Results ===");
  Console.writeLine(`Worker 1: ${result1}`);
  Console.writeLine(`Worker 2: ${result2}`);
  Console.writeLine(`Worker 3: ${result3}`);
  Console.writeLine(`Total: ${result1 + result2 + result3}`);
}
