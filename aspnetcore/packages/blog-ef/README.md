# ASP.NET Core + EF Core + SQLite Blog

This proof combines ASP.NET Core and EF Core declarations from the dynamic `@tsonic/dotnet/*` provider. It does not consume generated EF binding packages.

`ProofAspNetCoreBlogEf.csproj` owns:

- the `Microsoft.AspNetCore.App` framework reference;
- exact EF Core and SQLite NuGet versions;
- `packages.lock.json`;
- the deterministic managed NuGet compile-reference closure used for source-provider reflection;
- inclusion of only `out/csharp/**/*.cs`.

From `aspnetcore/`:

```sh
npm install
npm run -w aspnetcore-blog-ef build
dotnet run --project packages/blog-ef/ProofAspNetCoreBlogEf.csproj
```

Set `PROOF_URL` to override `http://localhost:8091`. Set `TS_PUDDING_DB` to select the SQLite database path.
