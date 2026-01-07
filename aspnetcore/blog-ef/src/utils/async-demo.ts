import { Task } from "@tsonic/dotnet/System.Threading.Tasks.js";

export async function* ticker(ticks: number, delayMs: number): AsyncGenerator<number> {
  for (let i = 0; i < ticks; i++) {
    await Task.delay(delayMs);
    yield i;
  }
}

