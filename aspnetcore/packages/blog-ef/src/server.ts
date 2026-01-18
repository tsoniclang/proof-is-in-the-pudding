import { Console } from "@tsonic/dotnet/System.js";

import { WebApplication } from "@tsonic/aspnetcore/Microsoft.AspNetCore.Builder.js";
import type { ExtensionMethods } from "@tsonic/aspnetcore/Microsoft.AspNetCore.Builder.js";

import { DB_PATH } from "./db/options.ts";
import { ensureCreatedAndSeed } from "./db/seed.ts";
import { handleHealth } from "./routes/health.ts";
import { handleIndex } from "./routes/index.ts";
import { handleCreateComment, handleListComments } from "./routes/comments.ts";
import { handleCreatePost, handleDeletePost, handleGetPost, handleListPosts, handleUpdatePost } from "./routes/posts.ts";

export function run(): void {
  ensureCreatedAndSeed();

  Console.WriteLine("=================================");
  Console.WriteLine("  Tsonic Blog (EF Core + SQLite)");
  Console.WriteLine("  http://localhost:8091");
  Console.WriteLine("  DB: " + DB_PATH);
  Console.WriteLine("=================================");

  const builder = WebApplication.CreateBuilder();
  const app = builder.Build() as ExtensionMethods<WebApplication>;

  app.MapGet("/", handleIndex);
  app.MapGet("/api/health", handleHealth);

  app.MapGet("/api/posts", handleListPosts);
  app.MapGet("/api/posts/{id:int}", handleGetPost);
  app.MapPost("/api/posts", handleCreatePost);
  app.MapPut("/api/posts/{id:int}", handleUpdatePost);
  app.MapDelete("/api/posts/{id:int}", handleDeletePost);

  app.MapGet("/api/posts/{id:int}/comments", handleListComments);
  app.MapPost("/api/posts/{id:int}/comments", handleCreateComment);

  app.Run("http://localhost:8091");
}
