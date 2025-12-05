# proof-is-in-the-pudding

Example projects demonstrating Tsonic compiler capabilities.

## Structure

This repository contains example projects in two runtime modes:

- `dotnet/` - Examples using dotnet runtime mode (direct .NET BCL access)
- `js/` - Examples using js runtime mode (JavaScript semantics)

## Examples

### hello-world

Basic "Hello World" example showing the differences between runtime modes.

- [dotnet/hello-world](./dotnet/hello-world) - Uses `Console.WriteLine` from `@tsonic/dotnet/System`
- [js/hello-world](./js/hello-world) - Uses standard `console.log`

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
