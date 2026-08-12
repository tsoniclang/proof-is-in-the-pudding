import {
  loadNativePointer,
  offsetNativePointer,
  storeNativePointer,
  unsafeContext,
} from "@tsonic/core/lang.js";
import type {
  NativePointer,
  int32,
  nativeInt,
} from "@tsonic/core/types.js";

export function copyAndRead(
  source: NativePointer<int32>,
  destination: NativePointer<int32>,
  elementOffset: nativeInt,
): int32 {
  unsafeContext();
  const selected = offsetNativePointer(source, elementOffset);
  const value = loadNativePointer(selected);
  storeNativePointer(destination, value);
  return value;
}
