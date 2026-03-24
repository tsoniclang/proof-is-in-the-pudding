import * as os from "node:os";
import * as timers from "node:timers";

function yieldToEventLoop(): Promise<void> {
  return new Promise((resolve) => {
    timers.setTimeout(() => resolve(), 0);
  });
}

async function runWorker(name: string, iterations: number): Promise<number> {
  console.log(`${name} starting...`);

  let sum = 0;
  for (let i = 0; i < iterations; i++) {
    sum += i;
    if ((i + 1) % 25000 === 0) {
      await yieldToEventLoop();
    }
  }

  console.log(`${name} done. Sum: ${sum}`);
  return sum;
}

export async function main(): Promise<void> {
  console.log("=== Concurrent Work Demo (Node.js surface) ===");
  console.log("");
  console.log(`Detected CPUs: ${os.cpus().length}`);
  console.log("");

  const iterations = 100000;
  console.log(`Running 3 concurrent workers with ${iterations} iterations each...`);
  console.log("");

  const results = await Promise.all([
    runWorker("Worker 1", iterations),
    runWorker("Worker 2", iterations),
    runWorker("Worker 3", iterations),
  ]);

  console.log("");
  console.log("=== Results ===");
  console.log(`Worker 1: ${results[0]}`);
  console.log(`Worker 2: ${results[1]}`);
  console.log(`Worker 3: ${results[2]}`);
  console.log(`Total: ${results[0] + results[1] + results[2]}`);
}
