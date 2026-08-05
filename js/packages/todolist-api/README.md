# JavaScript Todo API

Explicit JS-surface proof for arrays, `split`, `length`, promises, and typed JSON together with import-addressable `node:http`.

```sh
npm run build
PROOF_PORT=8080 dotnet run --project out/csharp/ProofJsTodoList.csproj
```

Routes are exact: `/todos`, `/todos/`, and `/todos/{integer}`.
