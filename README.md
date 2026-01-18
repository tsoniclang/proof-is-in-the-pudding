# proof-is-in-the-pudding

Example projects demonstrating Tsonic compiler capabilities.

## Structure

This repository groups example projects by which bindings packages they opt into:

- `bcl/` - Baseline .NET BCL examples (`@tsonic/dotnet`, `@tsonic/core`, `@tsonic/globals`)
- `js/` - Examples using the JSRuntime bindings via `@tsonic/js`
- `nodejs/` - Examples using the Node.js bindings via `@tsonic/nodejs`
- `aspnetcore/` - Examples using ASP.NET Core via `@tsonic/aspnetcore`
- `workspaces/` - Examples showing npm workspaces and multi-assembly repos

There is no special compiler "js mode" anymore: everything compiles to .NET; `@tsonic/js` and `@tsonic/nodejs` are just additional assemblies you can import.

## Import Syntax

All imports must use the `.js` extension per ESM conventions:

```typescript
// .NET imports
import { Console } from "@tsonic/dotnet/System.js";
import { List } from "@tsonic/dotnet/System.Collections.Generic.js";

// Core types
import { int, long } from "@tsonic/core/types.js";

// JSRuntime bindings
import { console } from "@tsonic/js/index.js";

// Node.js APIs
import { fs } from "@tsonic/nodejs/index.js";

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

- [bcl/fibonacci](./bcl/fibonacci) - Uses `int` type from `@tsonic/core`
- [js/fibonacci](./js/fibonacci)

### multithreading

Parallel computation using `System.Threading.Tasks.Parallel`.

- [bcl/multithreading](./bcl/multithreading)
- [js/multithreading](./js/multithreading)
- [nodejs/multithreading](./nodejs/multithreading)

### todolist-api

REST API server using `System.Net.HttpListener`.

- [bcl/todolist-api](./bcl/todolist-api) - Full CRUD API with JSON parsing
- [js/todolist-api](./js/todolist-api) - Same API using `@tsonic/js` helpers

### high-performance

High-performance examples using `Span<T>`, `ReadOnlySpan<T>`, and `Memory<T>`.

- [bcl/high-performance](./bcl/high-performance)

### aspnetcore-blog

Simple ASP.NET Core blog app.

- [aspnetcore/blog](./aspnetcore/blog)
- [aspnetcore/blog-ef](./aspnetcore/blog-ef) - EF Core + SQLite backend

### Node.js Examples

- [nodejs/webserver](./nodejs/webserver) - HTTP server using `@tsonic/nodejs/nodejs.Http.js`
- [nodejs/file-reader](./nodejs/file-reader) - File system operations using `@tsonic/nodejs/nodejs.js`
- [nodejs/env-info](./nodejs/env-info) - Environment information using Node.js APIs

## Building

Each example can be built individually:

```bash
cd bcl/hello-world  # or js/hello-world, nodejs/webserver, aspnetcore/blog
npx tsonic build src/App.ts
```

Or run the compiled binary:

```bash
./out/app
```

## Requirements

- Node.js 22+
- .NET 10 SDK
- Tsonic CLI (`npm install tsonic`)
