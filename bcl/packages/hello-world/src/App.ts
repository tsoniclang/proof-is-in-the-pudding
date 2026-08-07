import { Console } from "@tsonic/dotnet/System.js";
import {
  addressOf,
  allocatePointer,
  defaultValue,
  equalPointer,
  field,
  loadPointer,
  storePointer,
  struct,
} from "@tsonic/core/lang.js";
import type { int32, Pointer } from "@tsonic/core/types.js";

export const Pair = struct({
  left: field<int32>(),
  right: field<int32>(),
});

function increment(pointer: Pointer<int32>): void {
  storePointer(pointer, loadPointer(pointer) + 1);
}

function create(initial: int32): Pointer<int32> {
  return allocatePointer<int32>(initial);
}

function updatePair(): int32 {
  let pair: typeof Pair = defaultValue<typeof Pair>();
  pair.left = 1;
  const first = addressOf(pair.left);
  const second = addressOf(pair.left);
  storePointer(first, 3);
  return equalPointer(first, second) ? loadPointer(second) : pair.right;
}

export function main(): void {
  let local: int32 = 1;
  const alias = addressOf(local);
  increment(alias);

  const allocated = create(40);
  const independent = create(10);
  increment(allocated);

  const aliasIdentity = equalPointer(alias, addressOf(local));
  const allocationIdentity = equalPointer(allocated, independent);
  const missingIdentity = equalPointer<int32>(undefined, undefined);

  const values: int32[] = [3, 5];
  const element = addressOf(values[0]);
  const elementIdentity = equalPointer(element, addressOf(values[0]));
  const otherElementIdentity = equalPointer(element, addressOf(values[1]));
  storePointer(element, 4);

  Console.WriteLine(
    `Pointers: ${local}, ${loadPointer(allocated)}, ${loadPointer(independent)}, ${values[0]}`,
  );
  Console.WriteLine(
    `Pointer identity: ${aliasIdentity}, ${allocationIdentity}, ${missingIdentity}, ${elementIdentity}, ${otherElementIdentity}`,
  );
  Console.WriteLine(`Pointer value field: ${updatePair()}`);
  Console.WriteLine("Hello from Tsonic!");
}

main();
