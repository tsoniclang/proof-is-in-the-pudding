# Unscoped Multi-Project Workspace (npm workspaces)

Same as `workspaces/scoped-multi-project/`, but using unscoped package names:

- `acme-domain` (source package)
- `acme-api` (executable consuming the source package)

This validates direct source-package consumption for both scoped and unscoped packages.

## How to build

```bash
npm install
npm run build
```
