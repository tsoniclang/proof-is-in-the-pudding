import { process } from "@tsonic/nodejs/nodejs.js";

function computeSum(id: number, iterations: number): number {
  console.log(`Worker ${id} starting...`);
  let sum = 0;
  for (let i = 0; i < iterations; i++) {
    sum += i;
  }
  console.log(`Worker ${id} done. Sum: ${sum}`);
  return sum;
}

export function main(): void {
  console.log("=== Parallel Computation Test (nodejs mode) ===");
  console.log("");
  console.log(`Platform: ${process.platform}`);
  console.log(`Architecture: ${process.arch}`);
  console.log(`PID: ${process.pid}`);
  console.log("");

  const iterations = 100000;
  console.log(`Running 3 workers with ${iterations} iterations each...`);
  console.log("");

  const result1 = computeSum(1, iterations);
  const result2 = computeSum(2, iterations);
  const result3 = computeSum(3, iterations);

  console.log("");
  console.log("=== Results ===");
  console.log(`Worker 1: ${result1}`);
  console.log(`Worker 2: ${result2}`);
  console.log(`Worker 3: ${result3}`);
  console.log(`Total: ${result1 + result2 + result3}`);
}
