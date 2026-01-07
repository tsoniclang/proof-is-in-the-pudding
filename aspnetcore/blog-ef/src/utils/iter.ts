import { int } from "@tsonic/core/types.js";

export function* range(start: int, count: int): Generator<int> {
  for (let i = 0; i < count; i++) {
    yield start + i;
  }
}

