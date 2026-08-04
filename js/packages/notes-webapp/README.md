# JavaScript Notes API

Explicit JS-surface proof combining JavaScript arrays, dates, promises, and string APIs with import-addressable `node:http`. The Node capability supplies `node:*`; it does not select the JS surface.

```sh
npm run build
PROOF_PORT=8081 dotnet run --project out/csharp/ProofJsNotesWebApp.csproj
```

The verifier exercises exact CRUD routes, malformed JSON, invalid identifiers, missing items, and the HTML endpoint.
