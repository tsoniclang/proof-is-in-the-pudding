# ASP.NET Core Blog (EF Core + SQLite)

Full-featured blog demo using:

- ASP.NET Core Minimal APIs (`@tsonic/aspnetcore`)
- EF Core + SQLite (`@tsonic/efcore`, `@tsonic/efcore-sqlite`)

## Run

```bash
npm install
npm run build
./out/app
```

Then open `http://localhost:8091/` or use the JSON API:

- `GET /api/posts`
- `POST /api/posts`
- `GET /api/posts/{id}`
- `PUT /api/posts/{id}`
- `DELETE /api/posts/{id}`
- `GET /api/posts/{id}/comments`
- `POST /api/posts/{id}/comments`

