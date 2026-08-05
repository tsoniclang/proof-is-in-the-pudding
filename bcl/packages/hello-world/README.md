# CLR Hello World + NativeAOT

The TypeScript source calls `System.Console.WriteLine`. `ProofBclHelloWorld.csproj` is user-owned and enables `PublishAot`; Tsonic emits only C# source into `out/csharp`.

```sh
npm run build
dotnet publish ProofBclHelloWorld.csproj -c Release -r linux-x64 --self-contained true
```

Use the .NET runtime identifier for the current platform when publishing outside Linux x64.
