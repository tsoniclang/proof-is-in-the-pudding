// High-performance examples using Span<T>, ReadOnlySpan<T>, and Memory<T>
import { Console } from "@tsonic/dotnet/System.js";
import { Span, ReadOnlySpan, Memory } from "@tsonic/dotnet/System.js";
import { int } from "@tsonic/core/types.js";

// Example 1: Fill an array efficiently using Span
function fillArray(data: Span<int>, value: int): void {
  data.Fill(value);
}

// Example 2: Process array in chunks using slicing
function processInChunks(span: Span<int>, chunkSize: int): void {
  let offset: int = 0;

  while (offset < span.Length) {
    const remaining = span.Length - offset;
    const currentChunkSize = remaining < chunkSize ? remaining : chunkSize;
    const chunk = span.Slice(offset, currentChunkSize);

    Console.WriteLine(`Processing chunk at offset ${offset}, size ${chunk.Length}`);
    offset = offset + currentChunkSize;
  }
}

// Main entry point
function main(): void {
  Console.WriteLine("=== High Performance Span Examples ===");
  Console.WriteLine("");

  // Create an array and wrap it in a Span
  const numbers: int[] = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

  // Create a Span from the array
  const span = new Span<int>(numbers);
  Console.WriteLine(`Created Span with ${span.Length} elements`);
  Console.WriteLine(`Span isEmpty: ${span.IsEmpty}`);

  // Create a slice (no allocation, just a view)
  const slice = span.Slice(2, 5);
  Console.WriteLine(`Created slice from index 2, length 5: ${slice.Length} elements`);

  // Convert to array to display
  const sliceArray = slice.ToArray();
  Console.WriteLine(`Slice contains: ${sliceArray[0]}, ${sliceArray[1]}, ${sliceArray[2]}, ${sliceArray[3]}, ${sliceArray[4]}`);

  // Fill a portion
  Console.WriteLine("");
  Console.WriteLine("Filling slice with value 99...");
  slice.Fill(99);

  // Show original array is modified (Span is a view)
  Console.WriteLine("Original array after fill:");
  Console.WriteLine(`[${numbers[0]}, ${numbers[1]}, ${numbers[2]}, ${numbers[3]}, ${numbers[4]}, ${numbers[5]}, ${numbers[6]}, ${numbers[7]}, ${numbers[8]}, ${numbers[9]}]`);

  // Process in chunks
  Console.WriteLine("");
  Console.WriteLine("Processing array in chunks of 3:");
  processInChunks(span, 3);

  // Memory<T> example - heap-allocated, can be stored in fields
  Console.WriteLine("");
  Console.WriteLine("=== Memory<T> Example ===");
  const memory = new Memory<int>(numbers);
  Console.WriteLine(`Memory length: ${memory.Length}`);
  Console.WriteLine(`Memory isEmpty: ${memory.IsEmpty}`);

  // Copy between spans
  Console.WriteLine("");
  Console.WriteLine("=== Copy Example ===");
  const source: int[] = [100, 200, 300];
  const dest: int[] = [0, 0, 0, 0, 0];
  const sourceSpan = new Span<int>(source);
  const destSpan = new Span<int>(dest);

  sourceSpan.CopyTo(destSpan);
  Console.WriteLine(`After copy: [${dest[0]}, ${dest[1]}, ${dest[2]}, ${dest[3]}, ${dest[4]}]`);

  Console.WriteLine("");
  Console.WriteLine("Done!");
}

main();
