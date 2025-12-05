# proof-is-in-the-pudding

Example projects demonstrating Tsonic compiler capabilities.

## Structure

This repository contains example projects in two runtime modes:

- `dotnet/` - Examples using dotnet runtime mode (direct .NET BCL access)
- `js/` - Examples using js runtime mode (JavaScript semantics)

## Examples

### hello-world

Basic "Hello World" example showing the differences between runtime modes.

- [dotnet/hello-world](./dotnet/hello-world) - Uses `Console.writeLine` from `@tsonic/dotnet/System`
- [js/hello-world](./js/hello-world) - Uses standard `console.log`

### calculator

Simple calculator with add, subtract, multiply, divide operations and division-by-zero handling.

- [dotnet/calculator](./dotnet/calculator) - Uses `Console.writeLine` from `@tsonic/dotnet/System`
- [js/calculator](./js/calculator) - Uses standard `console.log`

### fibonacci

Fibonacci sequence with both recursive and iterative implementations.

- [dotnet/fibonacci](./dotnet/fibonacci) - Uses `Console.writeLine` from `@tsonic/dotnet/System`
- [js/fibonacci](./js/fibonacci) - Uses standard `console.log`

## Building

Each example can be built individually:

```bash
cd dotnet/hello-world  # or js/hello-world
npm run build
```

## Requirements

- Node.js 22+
- .NET 10 SDK
- Tsonic CLI (`npx @tsonic/tsonic`)
