// Debug test: Compare direct instantiation vs property access
import { Console } from "@tsonic/dotnet/System.js";
import { List } from "@tsonic/dotnet/System.Collections.Generic.js";
import { HttpListener } from "@tsonic/dotnet/System.Net.js";
import { int } from "@tsonic/core/types.js";

export function main(): void {
  // Case 1: Direct instantiation - this works
  const numbers = new List<int>();
  numbers.add(1);  // Should translate to Add
  Console.writeLine("Count: " + numbers.count);  // Should translate to Count

  // Case 2: Property access - does this work?
  const listener = new HttpListener();
  listener.prefixes.add("http://localhost:8080/");  // Does this translate to Add?

  Console.writeLine("Done");
}
