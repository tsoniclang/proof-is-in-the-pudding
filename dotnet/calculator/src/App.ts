import { Console } from "@tsonic/dotnet/System";

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
    Console.writeLine("Error: Division by zero!");
    return 0.0;
  }
  return a / b;
}

export function main(): void {
  Console.writeLine("=== Calculator Demo ===");

  const x: number = 10.0;
  const y: number = 3.0;

  Console.writeLine(`x = ${x}`);
  Console.writeLine(`y = ${y}`);
  Console.writeLine("");

  Console.writeLine(`add(x, y) = ${add(x, y)}`);
  Console.writeLine(`subtract(x, y) = ${subtract(x, y)}`);
  Console.writeLine(`multiply(x, y) = ${multiply(x, y)}`);
  Console.writeLine(`divide(x, y) = ${divide(x, y)}`);
  Console.writeLine("");

  Console.writeLine("Testing division by zero:");
  divide(x, 0.0);
}
