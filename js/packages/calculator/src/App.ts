import { console } from "@tsonic/js/index.js";

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
    console.log("Error: Division by zero!");
    return 0.0;
  }
  return a / b;
}

export function main(): void {
  console.log("=== Calculator Demo ===");

  const x: number = 10.0;
  const y: number = 3.0;

  console.log(`x = ${x}`);
  console.log(`y = ${y}`);
  console.log("");

  console.log(`add(x, y) = ${add(x, y)}`);
  console.log(`subtract(x, y) = ${subtract(x, y)}`);
  console.log(`multiply(x, y) = ${multiply(x, y)}`);
  console.log(`divide(x, y) = ${divide(x, y)}`);
  console.log("");

  console.log("Testing division by zero:");
  divide(x, 0.0);
}
