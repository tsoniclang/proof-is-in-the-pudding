import { abi } from "test:abi";
import { addressOf, equalPointer, loadPointer, storePointer, memoryLayout,
  offsetRawPointer, reinterpretRawPointer, toRawPointer, unsafeContext } from "@tsonic/core/lang.js";
import type { Pointer, uint32 } from "@tsonic/core/types.js";

const word = memoryLayout<uint32>(abi, 4, 4, 8);

function retainedElement(): Pointer<uint32> {
  unsafeContext();
  let values: uint32[] = [7, 8];
  const alias = values;
  const pointer = addressOf(values[0]);
  const raw = toRawPointer(pointer, word);
  const same = addressOf(alias[0]);
  if (!equalPointer(pointer, same)) throw new Error("array element identity");
  storePointer(pointer, 9);
  if (alias[0] !== 9) throw new Error("array backing was copied");
  alias[0] = 11;
  const neighbor = reinterpretRawPointer(offsetRawPointer(raw, 8, abi), word);
  if (neighbor === undefined || loadPointer(neighbor) !== 8) throw new Error("array stride");
  values = [99];
  if (loadPointer(pointer) !== 11 || values[0] !== 99) throw new Error("array pointer retargeted");
  return same;
}

function retainedField(): Pointer<uint32> {
  let cell: { value: uint32 } = { value: 7 };
  const alias = cell;
  const pointer = addressOf(cell.value);
  toRawPointer(pointer, word);
  storePointer(pointer, 9);
  if (alias.value !== 9) throw new Error("field backing was copied");
  alias.value = 11;
  cell = { value: 99 };
  if (loadPointer(pointer) !== 11 || cell.value !== 99) throw new Error("field pointer retargeted");
  return pointer;
}

export function verifyNativeStorage(): boolean {
  unsafeContext();
  const element = retainedElement();
  const field = retainedField();
  const restored = reinterpretRawPointer(toRawPointer(element, word), word);
  if (restored === undefined || !equalPointer(restored, element)) return false;
  storePointer(restored, 21);
  storePointer(field, 22);
  return loadPointer(element) === 21 && loadPointer(field) === 22;
}
