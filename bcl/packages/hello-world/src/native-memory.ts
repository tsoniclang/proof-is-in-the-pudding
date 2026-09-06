import { abi } from "test:abi";
import { memoryLayout, allocatePointer, addressOf, loadPointer, storePointer,
  toRawPointer, reinterpretRawPointer, equalPointer, equalRawPointer, hashPointer,
  offsetRawPointer, unsafeContext, keepAlive } from "@tsonic/core/lang.js";
import type { Pointer, RawPointer, uint32, uint8 } from "@tsonic/core/types.js";
const word = memoryLayout<uint32>(abi, 4, 4, 4);
const byte = memoryLayout<uint8>(abi, 1, 1, 1);
function pass(pointer: Pointer<uint32>): Pointer<uint32> { return pointer; }
function genericPass<T>(pointer: Pointer<T>): Pointer<T> { return pointer; }
function closedGeneric() { return genericPass(allocatePointer<uint32>(93)); }
function rawPass(pointer: RawPointer | undefined): RawPointer | undefined { return pointer; }
function create(): Pointer<uint32> { return allocatePointer<uint32>(41); }
interface PointerHolder { pointer: Pointer<uint32> }
interface RawHolder { pointer: RawPointer | undefined }
function createRaw(): RawPointer | undefined { return toRawPointer(allocatePointer<uint32>(51), word); }
function inferredRead(raw: RawPointer | undefined) {
  unsafeContext();
  return reinterpretRawPointer(raw, word);
}
function inferredOptional(flag: boolean) {
  if (flag) return allocatePointer<uint32>(81);
}
function annotatedOptional(flag: boolean): Pointer<uint32> | undefined {
  if (flag) return allocatePointer<uint32>(82);
}
function callableReturns(): boolean {
  const callback = (flag: boolean) => {
    if (flag) return allocatePointer<uint32>(90);
  };
  const value = callback(true);
  return value !== undefined && loadPointer(value) === 90 &&
    callback(false) === undefined && loadPointer(closedGeneric()) === 93;
}
function sameWord(actual: uint32, expected: uint32): boolean { return actual === expected; }
export function parameterRoundTrip(value: uint32 = 71): Pointer<uint32> {
  unsafeContext();
  const original = addressOf(value);
  const view = reinterpretRawPointer(toRawPointer(original, word), word);
  if (view !== undefined) storePointer(view, 72);
  if (value !== 72) throw new Error("native parameter alias");
  value = 73;
  return original;
}
export function verifyNativeMemory(): boolean {
  unsafeContext();
  let value: uint32 = 7;
  const original = addressOf(value);
  const raw = rawPass(toRawPointer(pass(original), word));
  const restored = reinterpretRawPointer(raw, word);
  if (restored === undefined) return false;
  if (!equalPointer(original, restored) || hashPointer(original) !== hashPointer(restored)) return false;
  storePointer(restored, 9);
  if (value !== 9) return false;
  value = 17;
  if (loadPointer(restored) !== 17) return false;
  const again = addressOf(value);
  if (!equalPointer(original, again)) return false;
  const firstByte = reinterpretRawPointer(raw, byte);
  if (firstByte === undefined) return false;
  storePointer(firstByte, 33);
  if (value !== 33) return false;
  const retained = create();
  const retainedRaw = toRawPointer(retained, word);
  const retainedAlias = reinterpretRawPointer(offsetRawPointer(retainedRaw, 0, abi), word);
  if (retainedAlias === undefined) return false;
  storePointer(retainedAlias, 42);
  if (loadPointer(retained) !== 42) return false;
  const pointers: Pointer<uint32>[] = [allocatePointer<uint32>(61), allocatePointer<uint32>(62)];
  const pointerAlias = pointers;
  const arrayView = reinterpretRawPointer(toRawPointer(pointerAlias[1], word), word);
  if (arrayView === undefined) return false;
  storePointer(arrayView, 63);
  if (loadPointer(pointers[1]) !== 63) return false;
  const previousElement = pointers[1];
  pointers[1] = allocatePointer<uint32>(64);
  const changedElement = reinterpretRawPointer(toRawPointer(pointers[1], word), word);
  if (changedElement === undefined) return false;
  storePointer(changedElement, 65);
  if (loadPointer(pointers[1]) !== 65 || loadPointer(previousElement) !== 63) return false;
  const holder: PointerHolder = { pointer: retained };
  const holderView = reinterpretRawPointer(toRawPointer(holder.pointer, word), word);
  if (holderView === undefined) return false;
  storePointer(holderView, 44);
  if (loadPointer(retained) !== 44) return false;
  const holderAlias = holder;
  holderAlias.pointer = allocatePointer<uint32>(45);
  const changedField = reinterpretRawPointer(toRawPointer(holder.pointer, word), word);
  if (changedField === undefined) return false;
  storePointer(changedField, 46);
  if (loadPointer(holderAlias.pointer) !== 46 || loadPointer(retained) !== 44) return false;
  const rawValues: (RawPointer | undefined)[] = [createRaw()];
  const rawHolder: RawHolder = { pointer: rawValues[0] };
  const ownerView = reinterpretRawPointer(rawHolder.pointer, word);
  if (ownerView === undefined || loadPointer(ownerView) !== 51) return false;
  storePointer(ownerView, 52);
  const ownerAlias = reinterpretRawPointer(rawValues[0], word);
  if (ownerAlias === undefined || loadPointer(ownerAlias) !== 52) return false;
  const incoming: uint32 = 71;
  const parameter = parameterRoundTrip(incoming);
  if (incoming !== 71 || loadPointer(parameter) !== 73) return false;
  if (loadPointer(parameterRoundTrip()) !== 73) return false;
  const inferred = inferredRead(raw);
  if (inferred === undefined || !equalPointer(inferred, original)) return false;
  storePointer(inferred, 84);
  if (!sameWord(value, 84)) return false;
  const optional = inferredOptional(true);
  if (optional === undefined || loadPointer(optional) !== 81 || inferredOptional(false) !== undefined) return false;
  const annotated = annotatedOptional(true);
  if (annotated === undefined || loadPointer(annotated) !== 82 || annotatedOptional(false) !== undefined) return false;
  if (!callableReturns()) return false;
  const nil = toRawPointer<uint32>(undefined, word);
  if (!equalRawPointer(nil, undefined) || reinterpretRawPointer(nil, word) !== undefined) return false;
  keepAlive(raw);
  return equalRawPointer(toRawPointer(restored, word), raw);
}
