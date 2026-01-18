// Debug test: Compare direct instantiation vs property access
import { Console } from "@tsonic/dotnet/System.js";
import { List } from "@tsonic/dotnet/System.Collections.Generic.js";
import { HttpListener } from "@tsonic/dotnet/System.Net.js";
import { int } from "@tsonic/core/types.js";

export function main(): void {
  // Case 1: Direct instantiation - this works
  const numbers = new List<int>();
  numbers.Add(1);
  Console.WriteLine("Count: " + numbers.Count);

  // Case 2: Property access - does this work?
  const listener = new HttpListener();
  listener.Prefixes.Add("http://localhost:8080/");

  Console.WriteLine("Done");
}
