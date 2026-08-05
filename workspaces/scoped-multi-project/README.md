# Scoped Source-Package Workspace

`@acme/domain` exports TypeScript source through standard ESM package exports. `@acme/api` imports that source directly:

```ts
import { TodoItem } from "@acme/domain/index.js";
```

No generated binding package or `tsonic.package.json` is involved. The workspace build preserves the source dependency order:

```sh
npm install
npm run build
dotnet run --project packages/api/out/csharp/AcmeApi.csproj
```
