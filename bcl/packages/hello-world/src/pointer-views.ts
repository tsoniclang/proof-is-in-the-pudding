import {
  bindPointer,
  equalPointer,
  hashPointer,
  keepAlive,
  loadPointer,
  projectPointer,
  storePointer,
} from "@tsonic/core/lang.js";
import type { int32 } from "@tsonic/core/types.js";

class Identity {
  value: int32 = 0;
}

export function verifyPointerViews(): boolean {
  const identity = new Identity();
  let value: int32 = 3;
  let reads: int32 = 0;
  let writes: int32 = 0;
  const pointer = bindPointer<int32>(
    identity,
    () => { reads++; return value; },
    next => { writes++; value = next; },
  );
  const alias = bindPointer<int32>(identity, () => value, next => { value = next; });
  const shifted = projectPointer<int32, int32>(pointer, next => next + 1, next => next - 1);
  const missing = projectPointer<int32, int32>(
    undefined,
    next => { reads++; return next; },
    next => { writes++; return next; },
  );
  if (!same(reads, 0) || !same(writes, 0) || missing !== undefined || hashPointer<int32>(undefined) !== 0) return false;
  if (!equalPointer(pointer, alias) || !equalPointer(pointer, shifted)) return false;
  if (hashPointer(pointer) !== hashPointer(alias) || hashPointer(pointer) !== hashPointer(shifted)) return false;
  if (loadPointer(shifted) !== 4) return false;
  storePointer(shifted, 10);
  if (!same(value, 9) || !same(reads, 1) || !same(writes, 1) || loadPointer(alias) !== 9) return false;
  const flag = projectPointer<int32, boolean>(pointer, next => next !== 0, next => next ? 1 : 0);
  if (hashPointer(flag) !== hashPointer(pointer)) return false;
  storePointer(flag, false);
  if (!same(value, 0) || loadPointer(flag)) return false;
  keepAlive(identity);
  return true;
}

function same(actual: int32, expected: int32): boolean {
  return actual === expected;
}
