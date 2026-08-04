# Unscoped Source-Package Workspace

`acme-domain` exports TypeScript source through standard ESM package exports. `acme-api` consumes `acme-domain/index.js` directly. This is the unscoped counterpart to the `@acme/domain` proof.

```sh
npm install
npm run build
dotnet run --project packages/acme-api/out/csharp/AcmeApi.csproj
```
