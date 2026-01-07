import { Console } from "@tsonic/dotnet/System.js";

import { WebApplication, EndpointRouteBuilderExtensions } from "@tsonic/aspnetcore/Microsoft.AspNetCore.Builder.js";

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
  const app = builder.build();

  EndpointRouteBuilderExtensions.mapGet(app, "/", handleIndex);
  EndpointRouteBuilderExtensions.mapGet(app, "/api/health", handleHealth);

  EndpointRouteBuilderExtensions.mapGet(app, "/api/posts", handleListPosts);
  EndpointRouteBuilderExtensions.mapGet(app, "/api/posts/{id:int}", handleGetPost);
  EndpointRouteBuilderExtensions.mapPost(app, "/api/posts", handleCreatePost);
  EndpointRouteBuilderExtensions.mapPut(app, "/api/posts/{id:int}", handleUpdatePost);
  EndpointRouteBuilderExtensions.mapDelete(app, "/api/posts/{id:int}", handleDeletePost);

  EndpointRouteBuilderExtensions.mapGet(app, "/api/posts/{id:int}/comments", handleListComments);
  EndpointRouteBuilderExtensions.mapPost(app, "/api/posts/{id:int}/comments", handleCreateComment);

  app.run("http://localhost:8091");
}
