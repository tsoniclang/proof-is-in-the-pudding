# proof-is-in-the-pudding

Example projects demonstrating Tsonic compiler capabilities.

## Structure

This repository groups example projects by which bindings packages they opt into:

- `bcl/` - Baseline .NET BCL examples (`@tsonic/dotnet`, `@tsonic/core`, `@tsonic/globals`)
- `js/` - Examples using the JS source package via `@tsonic/csharp-js`
- `nodejs/` - Examples using the JS surface plus the `@tsonic/csharp-nodejs` package
- `aspnetcore/` - Examples using ASP.NET Core via `@tsonic/aspnetcore`
- `workspaces/` - Examples showing npm workspaces and multi-assembly repos

All examples compile through Tsonic into .NET outputs. `@tsonic/csharp-js` is the
ambient JS surface, and `@tsonic/csharp-nodejs` is a regular package that contributes
`node:*` module bindings.

## Import Syntax

All imports must use the `.js` extension per ESM conventions:

```typescript
// .NET imports
import { Console } from "@tsonic/dotnet/System.js";
import { List } from "@tsonic/dotnet/System.Collections.Generic.js";

// C# target aliases
import { int, long } from "@tsonic/csharp/types.js";

// JS surface globals
console.log("hello");

// Node.js APIs
import * as fs from "node:fs";

// Local imports
import { MyModule } from "./MyModule.ts";
```

## Examples

### hello-world

Basic "Hello World" example.

- [bcl/hello-world](./bcl/hello-world) - Uses `Console.WriteLine` from `@tsonic/dotnet/System.js`
- [js/hello-world](./js/hello-world) - Uses standard `console.log`

### calculator

Simple calculator with add, subtract, multiply, divide operations.

- [bcl/calculator](./bcl/calculator)
- [js/calculator](./js/calculator)

### fibonacci

Fibonacci sequence with recursive and iterative implementations.

- [bcl/fibonacci](./bcl/fibonacci) - Uses `int` type from `@tsonic/csharp`
- [js/fibonacci](./js/fibonacci)

### multithreading

Parallel computation using `System.Threading.Tasks.Parallel`.

- [bcl/multithreading](./bcl/multithreading)
- [js/multithreading](./js/multithreading)
- [nodejs/multithreading](./nodejs/multithreading)

### todolist-api

REST API server using `System.Net.HttpListener`.

- [bcl/todolist-api](./bcl/todolist-api) - Full CRUD API with typed JSON parsing
- [js/todolist-api](./js/todolist-api) - Same API using `@tsonic/csharp-js` helpers

### high-performance

High-performance examples using `Span<T>`, `ReadOnlySpan<T>`, and `Memory<T>`.

- [bcl/high-performance](./bcl/high-performance)

### aspnetcore-blog

Simple ASP.NET Core blog app.

- [aspnetcore/blog](./aspnetcore/blog)
- [aspnetcore/blog-ef](./aspnetcore/blog-ef) - EF Core + SQLite backend

### Node.js Examples

- [nodejs/webserver](./nodejs/webserver) - HTTP server using `node:http`
- [nodejs/file-reader](./nodejs/file-reader) - File system operations using `node:fs`
- [nodejs/env-info](./nodejs/env-info) - Environment information using Node.js APIs

## Building

Important: install dependencies **only at the workspace root** (e.g. `bcl/`, `js/`, `aspnetcore/`), not inside individual packages under `packages/*`.

Accidentally running `npm install` inside a workspace package can create nested `node_modules/` trees (multiple copies of `@tsonic/*` types), which can break TypeScript type identity and cause confusing errors.

Each example can be built individually:

```bash
cd bcl/hello-world  # or js/hello-world, nodejs/webserver, aspnetcore/blog
npx tsonic build src/App.ts
```

Or run the compiled binary:

```bash
./out/app
```

## Full verifier

Run the repository verifier from the repo root:

```bash
bash scripts/verify-all.sh
```

The verifier:

- installs dependencies at workspace roots only
- overlays local sibling `@tsonic/*` package repos when they are checked out
  beside this repo
- overlays regenerated binding repos such as `dotnet`, `aspnetcore`,
  `microsoft-extensions`, `efcore`, and provider packages before building
  examples that consume those surfaces
- uses `.tests/nuget/packages` as the shared NuGet package cache
- removes per-example build artifacts before and after each verification unit

The examples use closed JSON payload types and generated serialization metadata.
They do not depend on open-ended `any`, `JsValue`, or reflection-style JSON
object traversal.

Set `PROOF_KEEP_ARTIFACTS=1` to preserve generated `.tsonic`, `generated`,
`out`, and `dist` directories for debugging. Set `PROOF_NUGET_PACKAGES_DIR` to
override the shared NuGet cache directory.

## Requirements

- Node.js 22+
- .NET 10 SDK
- Tsonic CLI (`npm install tsonic`)
