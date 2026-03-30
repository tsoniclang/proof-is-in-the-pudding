# Scoped Multi-Project Workspace (npm workspaces)

This example demonstrates a single repo with a source package dependency:

- `@acme/domain` is a **Tsonic source package**
- `@acme/api` is a **Tsonic executable** that imports the domain package directly

The API package consumes the domain package through source-package exports:

```ts
import { TodoItem } from "@acme/domain/index.js";
```

## How to build (from this directory)

```bash
npm install
npm run build
```

This runs (in order):
1) `tsonic build` for `@acme/domain`
2) `tsonic build` for `@acme/api` (resolves `@acme/domain` as a source package)

## Notes

- The domain package declares source metadata in `tsonic.package.json`.
- No generated CLR binding package or direct DLL reference is involved.
