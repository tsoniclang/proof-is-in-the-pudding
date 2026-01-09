# Scoped Multi-Project Workspace (npm workspaces)

This example demonstrates a single repo producing multiple assemblies:

- `@acme/domain` is a **Tsonic library** (`Acme.Domain.dll`)
- `@acme/api` is a **Tsonic executable** that references the domain DLL

The domain package also generates **tsbindgen CLR bindings under `dist/`** and exposes them via npm `exports`,
so consumers can write ergonomic CLR imports:

```ts
import { TodoItem } from "@acme/domain/Acme.Domain.js";
```

## How to build (from this directory)

```bash
npm install
npm run build
```

This runs (in order):
1) `tsonic build` for `@acme/domain` (produces `dist/net10.0/Acme.Domain.dll`)
2) `tsbindgen generate` for `@acme/domain` (produces `dist/tsonic/bindings/...`)
3) `tsonic build` for `@acme/api` (references the domain DLL via `dotnet.libraries`)

## Notes

- These imports are **type-checked by `tsc`** but are not meant to run on Node.js.
- This workspace requires a Tsonic version that can discover `bindings.json` via npm `exports` (dist layout).

