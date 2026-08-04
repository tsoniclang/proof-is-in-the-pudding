# Node File Reader

Import-addressable `node:fs/promises` proof. The program enumerates its working directory and reads the tracked `fixture.txt`; verification never depends on a repository README or another ambient file.

```sh
npm run build
dotnet run --project out/csharp/ProofNodeFileReader.csproj
```
