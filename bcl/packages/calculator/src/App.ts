import { Console } from "@tsonic/dotnet/System.js";

function add(a: number, b: number): number {
  return a + b;
}

function subtract(a: number, b: number): number {
  return a - b;
}

function multiply(a: number, b: number): number {
  return a * b;
}

function divide(a: number, b: number): number {
  if (b === 0.0) {
    Console.WriteLine("Error: Division by zero!");
    return 0.0;
  }
  return a / b;
}

export function main(): void {
  Console.WriteLine("=== Calculator Demo ===");

  const x: number = 10.0;
  const y: number = 3.0;

  Console.WriteLine(`x = ${x}`);
  Console.WriteLine(`y = ${y}`);
  Console.WriteLine("");

  Console.WriteLine(`add(x, y) = ${add(x, y)}`);
  Console.WriteLine(`subtract(x, y) = ${subtract(x, y)}`);
  Console.WriteLine(`multiply(x, y) = ${multiply(x, y)}`);
  Console.WriteLine(`divide(x, y) = ${divide(x, y)}`);
  Console.WriteLine("");

  Console.WriteLine("Testing division by zero:");
  divide(x, 0.0);
}
