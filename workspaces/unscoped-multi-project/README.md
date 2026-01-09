# Unscoped Multi-Project Workspace (npm workspaces)

Same as `workspaces/scoped-multi-project/`, but using unscoped package names:

- `acme-domain` (library)
- `acme-api` (executable)

This validates that CLR import discovery works for both scoped and unscoped packages.

## How to build

```bash
npm install
npm run build
```

