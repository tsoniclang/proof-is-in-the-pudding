import { Console } from "@tsonic/dotnet/System";

function fibonacci(n: number): number {
  if (n <= 1) {
    return n;
  }
  return fibonacci(n - 1) + fibonacci(n - 2);
}

function fibonacciIterative(n: number): number {
  if (n <= 1) {
    return n;
  }
  let prev = 0;
  let curr = 1;
  for (let i = 2; i <= n; i++) {
    const next = prev + curr;
    prev = curr;
    curr = next;
  }
  return curr;
}

export function main(): void {
  Console.writeLine("=== Fibonacci Demo ===");
  Console.writeLine("");

  Console.writeLine("Recursive fibonacci:");
  for (let i = 0; i <= 10; i++) {
    Console.writeLine(`  fib(${i}) = ${fibonacci(i)}`);
  }

  Console.writeLine("");
  Console.writeLine("Iterative fibonacci (faster for large n):");
  const largeN = 40;
  Console.writeLine(`  fib(${largeN}) = ${fibonacciIterative(largeN)}`);
}
