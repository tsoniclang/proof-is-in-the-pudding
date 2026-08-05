import { Console, Environment } from "@tsonic/dotnet/System.js";

import { WebApplication } from "@tsonic/dotnet/Microsoft.AspNetCore.Builder.js";

import { DB_PATH } from "./db/options.js";
import { ensureCreatedAndSeed } from "./db/seed.js";
import { handleHealth } from "./routes/health.js";
import { handleIndex } from "./routes/index.js";
import { handleCreateComment, handleListComments } from "./routes/comments.js";
import { handleCreatePost, handleDeletePost, handleGetPost, handleListPosts, handleUpdatePost } from "./routes/posts.js";

export function run(): void {
  ensureCreatedAndSeed();
  const serverUrl = Environment.GetEnvironmentVariable("PROOF_URL") ?? "http://localhost:8091";

  Console.WriteLine("=================================");
  Console.WriteLine("  Tsonic Blog (EF Core + SQLite)");
  Console.WriteLine("  " + serverUrl);
  Console.WriteLine("  DB: " + DB_PATH);
  Console.WriteLine("=================================");

  const builder = WebApplication.CreateBuilder();
  const app = builder.Build();

  app.MapGet("/", handleIndex);
  app.MapGet("/api/health", handleHealth);

  app.MapGet("/api/posts", handleListPosts);
  app.MapGet("/api/posts/{id:int}", handleGetPost);
  app.MapPost("/api/posts", handleCreatePost);
  app.MapPut("/api/posts/{id:int}", handleUpdatePost);
  app.MapDelete("/api/posts/{id:int}", handleDeletePost);

  app.MapGet("/api/posts/{id:int}/comments", handleListComments);
  app.MapPost("/api/posts/{id:int}/comments", handleCreateComment);

  app.Run(serverUrl);
}
