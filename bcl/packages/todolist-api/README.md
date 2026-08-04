# CLR HttpListener Todo API

Pure C#/.NET source-profile proof for `HttpListener`, CLR `string.Split`, CLR array `Length`, exact integer parsing, typed JSON parsing, `List<T>`, `Dictionary<TKey,TValue>`, and response streams.

```sh
npm run build
PROOF_PORT=8080 dotnet run --project out/csharp/ProofBclTodoList.csproj
```

Routes are exact: `/todos`, `/todos/`, and `/todos/{int}`. Invalid or extra path segments do not fall back to another handler.
