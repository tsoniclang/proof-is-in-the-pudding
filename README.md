# proof-is-in-the-pudding

Example projects demonstrating Tsonic compiler capabilities.

## Structure

This repository contains example projects in three runtime modes:

- `dotnet/` - Examples using dotnet runtime mode (direct .NET BCL access, C# arrays)
- `js/` - Examples using js runtime mode (JavaScript semantics with .NET interop)
- `nodejs/` - Examples using Node.js APIs via `@tsonic/nodejs`

## Import Syntax

All imports must use the `.js` extension per ESM conventions:

```typescript
// .NET imports
import { Console } from "@tsonic/dotnet/System.js";
import { List } from "@tsonic/dotnet/System.Collections.Generic.js";

// Core types
import { int, long } from "@tsonic/core/types.js";

// Node.js APIs
import { fs } from "@tsonic/nodejs/index.js";

// Local imports
import { MyModule } from "./MyModule.ts";
```

## Examples

### hello-world

Basic "Hello World" example.

- [dotnet/hello-world](./dotnet/hello-world) - Uses `Console.writeLine` from `@tsonic/dotnet/System.js`
- [js/hello-world](./js/hello-world) - Uses standard `console.log`

### calculator

Simple calculator with add, subtract, multiply, divide operations.

- [dotnet/calculator](./dotnet/calculator)
- [js/calculator](./js/calculator)

### fibonacci

Fibonacci sequence with recursive and iterative implementations.

- [dotnet/fibonacci](./dotnet/fibonacci) - Uses `int` type from `@tsonic/core`
- [js/fibonacci](./js/fibonacci)

### multithreading

Parallel computation using `System.Threading.Tasks.Parallel`.

- [dotnet/multithreading](./dotnet/multithreading) - Direct .NET arrays
- [js/multithreading](./js/multithreading) - JS array semantics
- [nodejs/multithreading](./nodejs/multithreading) - Node.js mode

### todolist-api

REST API server using `System.Net.HttpListener`.

- [dotnet/todolist-api](./dotnet/todolist-api) - Full CRUD API with JSON parsing
- [js/todolist-api](./js/todolist-api) - Same API with JS array semantics

### high-performance

High-performance examples using `Span<T>`, `ReadOnlySpan<T>`, and `Memory<T>`.

- [dotnet/high-performance](./dotnet/high-performance)

### Node.js Examples

- [nodejs/webserver](./nodejs/webserver) - HTTP server using `@tsonic/nodejs/nodejs.Http.js`
- [nodejs/file-reader](./nodejs/file-reader) - File system operations using `@tsonic/nodejs/nodejs.js`
- [nodejs/env-info](./nodejs/env-info) - Environment information using Node.js APIs

## Building

Each example can be built individually:

```bash
cd dotnet/hello-world  # or js/hello-world, nodejs/webserver
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
