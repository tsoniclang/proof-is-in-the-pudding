import { Console } from "@tsonic/dotnet/System.js";
import {
  addressOf,
  allocatePointer,
  loadPointer,
  storePointer,
} from "@tsonic/core/lang.js";
import type { int32, Pointer } from "@tsonic/core/types.js";

function increment(pointer: Pointer<int32>): void {
  storePointer(pointer, loadPointer(pointer) + 1);
}

function create(initial: int32): Pointer<int32> {
  return allocatePointer<int32>(initial);
}

export function main(): void {
  let local: int32 = 1;
  const alias = addressOf(local);
  increment(alias);

  const allocated = create(40);
  const independent = create(10);
  increment(allocated);

  const values: int32[] = [3];
  const element = addressOf(values[0]);
  storePointer(element, 4);

  Console.WriteLine(
    `Pointers: ${local}, ${loadPointer(allocated)}, ${loadPointer(independent)}, ${values[0]}`,
  );
  Console.WriteLine("Hello from Tsonic!");
}

main();
