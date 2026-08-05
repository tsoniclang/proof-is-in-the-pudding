# Pure-C# Node Capability Isolation

This project deliberately does **not** select the JS surface. It imports `node:path` and `node:process`, then prints through `System.Console` from the C#/.NET source profile.

```sh
npm run build
dotnet run --project out/csharp/ProofNodeEnvInfo.csproj
```

Its purpose is to prove that installing and importing the Node capability does not make JavaScript globals available.
