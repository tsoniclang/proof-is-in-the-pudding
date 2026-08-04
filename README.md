# Proof Is in the Pudding

This repository is the executable downstream proof for Tsonic’s C# target. Every project is real TypeScript input, is checked through the selected source contract, emits C#, builds with the .NET SDK, and either runs to an exact finite result or passes an HTTP behavior contract.

## Source Contracts

Pure C# projects use the target’s default C#/.NET source profile:

```ts
import { Console } from "@tsonic/dotnet/System.js";
import { List } from "@tsonic/dotnet/System.Collections.Generic.js";
import type { int } from "@tsonic/csharp/types.js";

const values = new List<int>();
values.Add(42);
Console.WriteLine(values.Count);
```

`@tsonic/dotnet/*`, `@tsonic/csharp/types.js`, and `@tsonic/core/lang.js` are compiler-owned virtual source modules. They are not npm dependencies.

Projects that intentionally use JavaScript source APIs select the `js` surface in `tsonic.json`:

```json
{
  "targets": [{
    "id": "csharp",
    "surfaces": ["js"]
  }]
}
```

```ts
const parts = "/todos/42".split("/");
console.log(parts.length);
```

Node is a capability package, not a source surface. A project importing `node:*` declares `@tsonic/csharp-nodejs` directly:

```ts
import { readFile } from "node:fs/promises";
```

Installing the Node capability does not select JavaScript globals. `nodejs/packages/env-info` proves this by using `node:path` and `node:process` under the pure C# source profile while printing through `System.Console`.

## npm Ownership

Each workspace is installed once at its workspace root. Each project directly declares only:

- `@tsonic/cli`;
- `@tsonic/target-csharp`;
- `@tsonic/csharp-nodejs` when that project imports `node:*`.

The C# target owns its runtime dependencies transitively. There are no direct proof dependencies on `@tsonic/csharp-runtime`, `@tsonic/csharp-js`, generated binding packages, or retired EF packages.

## Project Inventory

| Group | Proofs |
| --- | --- |
| `bcl` | Hello World, calculator, Fibonacci, `Span<T>`/`Memory<T>`, CLR parallel execution, `HttpListener` todo API |
| `js` | Hello World, calculator, Fibonacci, Promise-based concurrency, notes API, todo API |
| `nodejs` | Pure-C# Node isolation, file I/O, Promise-based Node concurrency, HTTP server |
| `aspnetcore` | Minimal API blog and EF Core/SQLite blog using dynamic `@tsonic/dotnet/*` provider declarations |
| `workspaces` | Scoped and unscoped source-package consumption, each with a library and executable |

The inventory contains 22 `tsonic.json` projects. `node scripts/check-architecture.mjs` derives that count from the filesystem and fails if a project is missing from the verifier model.

## Building One Workspace

Install from a workspace root, never from a child under `packages/*`:

```sh
cd bcl
npm install
npm run build
```

For a generated target project:

```sh
dotnet run --project packages/calculator/out/csharp/ProofBclCalculator.csproj
```

## User-Owned .NET Projects

Advanced .NET configuration stays in user-owned `.csproj` files:

- `bcl/packages/hello-world/ProofBclHelloWorld.csproj` owns NativeAOT publication;
- `aspnetcore/packages/blog/ProofAspNetCoreBlog.csproj` owns the ASP.NET framework reference;
- `aspnetcore/packages/blog-ef/ProofAspNetCoreBlogEf.csproj` owns NuGet versions, the NuGet lock, framework references, and the deterministic package-reference set used by provider reflection.

Tsonic writes only `out/csharp/**/*.cs` in this mode. The user project explicitly includes that generated source; Tsonic does not rewrite the project file.

For the EF proof:

```sh
cd aspnetcore
npm install
npm run -w aspnetcore-blog-ef build
dotnet run --project packages/blog-ef/ProofAspNetCoreBlogEf.csproj
```

The package build first restores the locked NuGet graph and materializes its deterministic managed package-reference closure, then runs Tsonic.

## Complete Verification

```sh
bash scripts/verify-all.sh
```

The verifier follows one bounded model:

1. inspect the exact clean sibling repository heads;
2. build Tsonic, the C# target, and the Node capability once;
3. pack exact local npm artifacts and record their SHA-256 hashes;
4. copy proof inputs into a fresh run directory, excluding all prior installs and outputs;
5. install the packed artifacts into each staged workspace without persistent sibling symlinks;
6. run the 22 project lifecycles through a dependency-aware dynamic queue;
7. constrain every command with a systemd memory scope and finite timeout;
8. assert complete finite output or complete HTTP behavior, scan emitted C# for forbidden reflection/dynamic semantics, and verify NativeAOT execution;
9. consolidate every task log and resource measurement into one report.

The default queue has at most eight workers and reserves at most 11,264 MiB across concurrent project tasks. Override those finite bounds with `PROOF_JOBS` and `PROOF_MEMORY_MIB`.

Every run uses a new `.tests/verify-*` directory. It never consumes an existing `node_modules`, generated C# tree, binary, provider cache, or prior report as semantic input. An OS file lock prevents two full verifiers from sharing state. The final report contains exact task counts, zero implicit skips/todos, package hashes, repository heads, elapsed time, CPU use, and peak memory for each command.

## Requirements

- Node.js 22 or newer;
- .NET 10 SDK;
- Linux systemd user scopes for the complete bounded verifier;
- a NativeAOT-capable toolchain for the current OS/architecture.
