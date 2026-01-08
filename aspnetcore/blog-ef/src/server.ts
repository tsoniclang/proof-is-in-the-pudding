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

  Console.writeLine("=================================");
  Console.writeLine("  Tsonic Blog (EF Core + SQLite)");
  Console.writeLine("  http://localhost:8091");
  Console.writeLine("  DB: " + DB_PATH);
  Console.writeLine("=================================");

  const builder = WebApplication.createBuilder();
  const app = builder.build() as ExtensionMethods<WebApplication>;

  app.mapGet("/", handleIndex);
  app.mapGet("/api/health", handleHealth);

  app.mapGet("/api/posts", handleListPosts);
  app.mapGet("/api/posts/{id:int}", handleGetPost);
  app.mapPost("/api/posts", handleCreatePost);
  app.mapPut("/api/posts/{id:int}", handleUpdatePost);
  app.mapDelete("/api/posts/{id:int}", handleDeletePost);

  app.mapGet("/api/posts/{id:int}/comments", handleListComments);
  app.mapPost("/api/posts/{id:int}/comments", handleCreateComment);

  app.run("http://localhost:8091");
}
