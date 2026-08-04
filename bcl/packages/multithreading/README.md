# CLR Parallel Execution

This is the one proof that intentionally uses real CLR parallelism. Three closed callbacks run through `System.Threading.Tasks.Parallel.Invoke`, then deterministic result slots are verified.

```sh
npm run build
dotnet run --project out/csharp/ProofBclMultithreading.csproj
```
