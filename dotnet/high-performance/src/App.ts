// High-performance examples using Span<T>, ReadOnlySpan<T>, and Memory<T>
import { Console } from "@tsonic/dotnet/System.js";
import { Span, ReadOnlySpan, Memory } from "@tsonic/dotnet/System.js";
import { int } from "@tsonic/core/types.js";

// Example 1: Fill an array efficiently using Span
function fillArray(data: Span<int>, value: int): void {
  data.fill(value);
}

// Example 2: Process array in chunks using slicing
function processInChunks(span: Span<int>, chunkSize: int): void {
  let offset = 0 as int;

  while (offset < span.length) {
    const remaining = span.length - offset;
    const currentChunkSize = remaining < chunkSize ? remaining : chunkSize;
    const chunk = span.slice(offset, currentChunkSize);

    Console.writeLine(`Processing chunk at offset ${offset}, size ${chunk.length}`);
    offset = offset + currentChunkSize;
  }
}

// Main entry point
function main(): void {
  Console.writeLine("=== High Performance Span Examples ===");
  Console.writeLine("");

  // Create an array and wrap it in a Span
  const numbers: int[] = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

  // Create a Span from the array
  const span = new Span<int>(numbers);
  Console.writeLine(`Created Span with ${span.length} elements`);
  Console.writeLine(`Span isEmpty: ${span.isEmpty}`);

  // Create a slice (no allocation, just a view)
  const slice = span.slice(2, 5);
  Console.writeLine(`Created slice from index 2, length 5: ${slice.length} elements`);

  // Convert to array to display
  const sliceArray = slice.toArray();
  Console.writeLine(`Slice contains: ${sliceArray[0]}, ${sliceArray[1]}, ${sliceArray[2]}, ${sliceArray[3]}, ${sliceArray[4]}`);

  // Fill a portion
  Console.writeLine("");
  Console.writeLine("Filling slice with value 99...");
  slice.fill(99);

  // Show original array is modified (Span is a view)
  Console.writeLine("Original array after fill:");
  Console.writeLine(`[${numbers[0]}, ${numbers[1]}, ${numbers[2]}, ${numbers[3]}, ${numbers[4]}, ${numbers[5]}, ${numbers[6]}, ${numbers[7]}, ${numbers[8]}, ${numbers[9]}]`);

  // Process in chunks
  Console.writeLine("");
  Console.writeLine("Processing array in chunks of 3:");
  processInChunks(span, 3);

  // Memory<T> example - heap-allocated, can be stored in fields
  Console.writeLine("");
  Console.writeLine("=== Memory<T> Example ===");
  const memory = new Memory<int>(numbers);
  Console.writeLine(`Memory length: ${memory.length}`);
  Console.writeLine(`Memory isEmpty: ${memory.isEmpty}`);

  // Copy between spans
  Console.writeLine("");
  Console.writeLine("=== Copy Example ===");
  const source: int[] = [100, 200, 300];
  const dest: int[] = [0, 0, 0, 0, 0];
  const sourceSpan = new Span<int>(source);
  const destSpan = new Span<int>(dest);

  sourceSpan.copyTo(destSpan);
  Console.writeLine(`After copy: [${dest[0]}, ${dest[1]}, ${dest[2]}, ${dest[3]}, ${dest[4]}]`);

  Console.writeLine("");
  Console.writeLine("Done!");
}

main();
