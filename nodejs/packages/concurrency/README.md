# Node Capability + JavaScript Concurrency

This proof combines import-addressable `node:os` and `node:timers` with the explicitly selected JS surface’s `Promise` APIs. It is cooperative event-loop concurrency, not worker-thread parallelism.

```sh
npm run build
dotnet run --project out/csharp/ProofNodeConcurrency.csproj
```
