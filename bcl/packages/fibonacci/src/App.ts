import { Console } from "@tsonic/dotnet/System.js";
import { int } from "@tsonic/core/types.js";

function fibonacci(n: int): int {
  if (n <= 1) {
    return n;
  }
  return fibonacci(n - 1) + fibonacci(n - 2);
}

function fibonacciIterative(n: int): int {
  if (n <= 1) {
    return n;
  }
  let prev: int = 0;
  let curr: int = 1;
  for (let i: int = 2; i <= n; i++) {
    const next: int = prev + curr;
    prev = curr;
    curr = next;
  }
  return curr;
}

export function main(): void {
  Console.WriteLine("=== Fibonacci Demo ===");
  Console.WriteLine("");

  Console.WriteLine("Recursive fibonacci:");
  for (let i: int = 0; i <= 10; i++) {
    Console.WriteLine(`  fib(${i}) = ${fibonacci(i)}`);
  }

  Console.WriteLine("");
  Console.WriteLine("Iterative fibonacci (faster for large n):");
  const largeN: int = 40;
  Console.WriteLine(`  fib(${largeN}) = ${fibonacciIterative(largeN)}`);
}
