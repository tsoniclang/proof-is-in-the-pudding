import { Console, Exception } from "@tsonic/dotnet/System.js";
import type { int } from "@tsonic/csharp/types.js";

let cleanupLog = "";

function* exchange(): Generator<int, string, int> {
  const first: int = yield 1;
  const second: int = yield first + 1;
  return `done:${second}`;
}

function* guarded(label: string): Generator<int, string, int> {
  try {
    yield 7;
    return "natural";
  } finally {
    cleanupLog += label;
  }
}

function* inner(): Generator<int, string, int> {
  const next: int = yield 2;
  return `inner:${next}`;
}

function* outer(): Generator<int, string, int> {
  return yield* inner();
}

async function* asyncRows(): AsyncGenerator<int, string, int> {
  const first: int = yield 10;
  yield first;
  return "async-done";
}

async function* asyncIterableRows(): AsyncGenerator<int, void, unknown> {
  yield 3;
  yield 7;
}

class SyncResource {
  label: string;

  constructor(label: string) {
    this.label = label;
  }

  [Symbol.dispose](): void {
    cleanupLog += this.label;
  }
}

class AsyncResource {
  label: string;

  constructor(label: string) {
    this.label = label;
  }

  async [Symbol.asyncDispose](): Promise<void> {
    cleanupLog += this.label;
  }
}

class FailingResource {
  [Symbol.dispose](): void {
    cleanupLog += "D";
    throw new Exception("dispose");
  }
}

class TopLevelResource {
  [Symbol.dispose](): void {
    Console.WriteLine(`top-level-disposed:${cleanupLog}`);
  }
}

async function useSelectedResource(
  resource: SyncResource | AsyncResource,
): Promise<void> {
  await using selected = resource;
  void selected;
}

async function* asyncResources(): AsyncGenerator<AsyncResource, void, unknown> {
  yield new AsyncResource("X");
  yield new AsyncResource("Y");
}

function failBodyAndDisposal(): void {
  using resource = new FailingResource();
  void resource;
  throw new Exception("body");
}

using topLevelResource = new TopLevelResource();
void topLevelResource;

async function main(): Promise<void> {
  const generator = exchange();
  const first = generator.next();
  const second = generator.next(4);
  const completed = generator.next(9);
  Console.WriteLine(`sync:${first.value as int},${second.value as int},${completed.value as string}`);

  const returnedGenerator = guarded("R");
  returnedGenerator.next();
  const returned = returnedGenerator.return("stopped");
  Console.WriteLine(`return:${returned.value as string}:${cleanupLog}`);

  const thrownGenerator = guarded("T");
  thrownGenerator.next();
  try {
    thrownGenerator.throw(new Exception("stop"));
  } catch {}
  Console.WriteLine(`throw:${cleanupLog}`);

  const delegated = outer();
  const delegatedFirst = delegated.next();
  const delegatedDone = delegated.next(5);
  Console.WriteLine(`delegate:${delegatedFirst.value as int},${delegatedDone.value as string}`);

  const asyncGenerator = asyncRows();
  const asyncFirstRequest = asyncGenerator.next();
  const asyncSecondRequest = asyncGenerator.next(12);
  const asyncFirst = await asyncFirstRequest;
  const asyncSecond = await asyncSecondRequest;
  const asyncDone = await asyncGenerator.next();
  Console.WriteLine(`async:${asyncFirst.value as int},${asyncSecond.value as int},${asyncDone.value as string}`);

  let sum: int = 0;
  for await (const value of asyncIterableRows()) {
    sum += value;
  }
  Console.WriteLine(`for-await:${sum}`);

  {
    using firstResource = new SyncResource("1");
    using secondResource = new SyncResource("2");
    void firstResource;
    void secondResource;
  }
  await using asyncResource = new AsyncResource("A");
  void asyncResource;

  await useSelectedResource(new SyncResource("U"));
  await useSelectedResource(new AsyncResource("V"));

  let enterClassicLoop = false;
  for (using loopResource = new SyncResource("F"); enterClassicLoop;) {
    void loopResource;
    enterClassicLoop = false;
  }

  for (using resource of [
    new SyncResource("O"),
    new SyncResource("P"),
  ]) {
    void resource;
  }

  for await (await using resource of asyncResources()) {
    void resource;
  }

  try {
    failBodyAndDisposal();
  } catch (error) {
    if (error instanceof Exception) {
      Console.WriteLine(`suppressed:${error.Message}:${cleanupLog}`);
    }
  }
  Console.WriteLine(`resources-before-async-exit:${cleanupLog}`);
}

await main();
Console.WriteLine(`resources-final:${cleanupLog}`);
