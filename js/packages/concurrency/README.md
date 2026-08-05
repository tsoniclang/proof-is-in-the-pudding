# JavaScript Concurrency

This proof uses `Promise`, `Promise.all`, `async`/`await`, and timers from the explicit JS source surface. It demonstrates cooperative concurrency; it does not claim worker threads or CLR parallel execution.

```sh
npm run build
dotnet run --project out/csharp/ProofJsConcurrency.csproj
```
