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
import { MyModule } from "./MyModule.js";
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

- verifies that every local `@tsonic/*` workspace link targets the active sibling checkout
- builds the shared compiler, C# target, and provider packages once before project verification
- inventories every non-temporary `tsonic.json` and requires every project to have exactly one test classification
- builds independent projects with a bounded parallel worker pool, after building workspace library prerequisites
- executes finite programs with semantic output assertions and long-running servers with HTTP behavior probes
- writes per-task diagnostics and one complete consolidated report under `.tests/`
- uses `.tests/nuget/packages` as the shared NuGet package cache
- preserves prior test artifacts and writes each run into a new timestamped directory

The examples parse inputs through closed payload schemas and invoke statically
selected serializers. They do not depend on open-ended `any`, `JsValue`, or
reflection-style JSON object traversal.

Set `PROOF_JOBS` to change the bounded project worker count. Set
`NUGET_PACKAGES` to override the shared NuGet cache directory.

## Requirements

- Node.js 22+
- .NET 10 SDK
- Tsonic CLI (`npm install tsonic`)
