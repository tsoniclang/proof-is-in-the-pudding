# ASP.NET Core Blog

This proof imports ASP.NET Core directly through the dynamic .NET provider:

```ts
import { WebApplication } from "@tsonic/dotnet/Microsoft.AspNetCore.Builder.js";
```

`ProofAspNetCoreBlog.csproj` is user-owned. It selects `Microsoft.AspNetCore.App`, includes only `out/csharp/**/*.cs`, and references the Tsonic C# runtime without allowing the SDK’s recursive source glob to consume package tooling.

From `aspnetcore/`:

```sh
npm install
npm run -w aspnetcore-blog build
dotnet run --project packages/blog/ProofAspNetCoreBlog.csproj
```

Set `PROOF_URL` to override the default `http://localhost:8090` endpoint.
