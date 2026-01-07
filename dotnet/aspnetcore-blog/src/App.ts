import { int } from "@tsonic/core/types.js";
import { StreamReader } from "@tsonic/dotnet/System.IO.js";
import { Encoding } from "@tsonic/dotnet/System.Text.js";
import { JsonSerializer } from "@tsonic/dotnet/System.Text.Json.js";
import { List } from "@tsonic/dotnet/System.Collections.Generic.js";
import { Task } from "@tsonic/dotnet/System.Threading.Tasks.js";
import { WebApplication, EndpointRouteBuilderExtensions } from "@tsonic/aspnetcore/Microsoft.AspNetCore.Builder.js";
import { HttpContext, HttpResponse, HttpResponseWritingExtensions } from "@tsonic/aspnetcore/Microsoft.AspNetCore.Http.js";

export interface Post {
  id: int;
  title: string;
  content: string;
}

export interface PostCreateInput {
  title: string;
  content: string;
}

export interface ErrorResponse {
  error: string;
}

const posts = new List<Post>();
const nextId: { value: int } = { value: 1 };

const INDEX_HTML = `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Tsonic Blog</title>
    <style>
      body { font-family: system-ui, -apple-system, Segoe UI, Roboto, sans-serif; margin: 2rem; line-height: 1.4; }
      header { display: flex; gap: 1rem; align-items: baseline; }
      .muted { color: #666; }
      input, textarea, button { font: inherit; padding: 0.5rem 0.75rem; }
      textarea { width: 100%; height: 8rem; }
      button { cursor: pointer; }
      .card { border: 1px solid #ddd; border-radius: 10px; padding: 1rem; margin: 1rem 0; }
      .card h3 { margin: 0 0 0.5rem 0; }
      .error { color: #b00020; }
      pre { white-space: pre-wrap; margin: 0; }
    </style>
  </head>
  <body>
    <header>
      <h1>Tsonic Blog</h1>
      <span class="muted">ASP.NET Core minimal API, compiled TS → C# → NativeAOT</span>
    </header>

    <section class="card">
      <h2>Create Post</h2>
      <div>
        <input id="title" placeholder="Title" style="width: 100%" />
      </div>
      <div style="margin-top: 0.75rem">
        <textarea id="content" placeholder="Write something..."></textarea>
      </div>
      <div style="margin-top: 0.75rem; display: flex; gap: 0.5rem; align-items: center">
        <button id="create">Create</button>
        <span id="status" class="muted"></span>
      </div>
      <div id="error" class="error" style="margin-top: 0.75rem"></div>
    </section>

    <section>
      <h2>Posts</h2>
      <div id="posts"></div>
    </section>

    <script>
      const el = (id) => document.getElementById(id);
      const escapeHtml = (s) =>
        String(s)
          .replaceAll("&", "&amp;")
          .replaceAll("<", "&lt;")
          .replaceAll(">", "&gt;")
          .replaceAll("\\"", "&quot;");

      async function api(path, options) {
        const res = await fetch(path, options);
        const text = await res.text();
        if (!res.ok) return { ok: false, error: text };
        return { ok: true, value: text ? JSON.parse(text) : null };
      }

      async function refresh() {
        const res = await api("/api/posts");
        if (!res.ok) {
          el("error").textContent = res.error;
          return;
        }
        const posts = res.value ?? [];
        const render = (p) =>
          '<div class="card">' +
            "<h3>" + escapeHtml(p.title) + "</h3>" +
            "<pre>" + escapeHtml(p.content) + "</pre>" +
          "</div>";
        el("posts").innerHTML = posts.map(render).join("");
      }

      el("create").addEventListener("click", async () => {
        el("error").textContent = "";
        el("status").textContent = "Creating...";
        const title = el("title").value;
        const content = el("content").value;
        const res = await api("/api/posts", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ title, content }),
        });
        if (!res.ok) el("error").textContent = res.error;
        el("title").value = "";
        el("content").value = "";
        el("status").textContent = "";
        await refresh();
      });

      refresh();
    </script>
  </body>
</html>
`;

const serializeError = (message: string): string =>
  JsonSerializer.serialize<ErrorResponse>({ error: message });

const readRequestBody = (ctx: HttpContext): string => {
  const reader = new StreamReader(ctx.request.body, Encoding.UTF8);
  const body = reader.readToEnd();
  reader.close();
  return body;
};

const writeText = (response: HttpResponse, statusCode: int, contentType: string, body: string): Task => {
  response.statusCode = statusCode;
  response.contentType = contentType;
  return HttpResponseWritingExtensions.writeAsync(response, body);
};

const writeJson = (response: HttpResponse, statusCode: int, body: string): Task =>
  writeText(response, statusCode, "application/json", body);

const handleIndex = (ctx: HttpContext): Task =>
  writeText(ctx.response, 200, "text/html; charset=utf-8", INDEX_HTML);

const handleListPosts = (ctx: HttpContext): Task => {
  const json = JsonSerializer.serialize<List<Post>>(posts);
  return writeJson(ctx.response, 200, json);
};

const handleCreatePost = (ctx: HttpContext): Task => {
  const body = readRequestBody(ctx);
  const input = JsonSerializer.deserialize<PostCreateInput>(body);
  if (input === undefined || typeof input.title !== "string" || typeof input.content !== "string") {
    return writeJson(ctx.response, 400, serializeError("Invalid JSON: expected {\"title\": \"...\", \"content\": \"...\"}"));
  }

  const id = nextId.value;
  nextId.value = id + 1;

  const post: Post = {
    id,
    title: input.title,
    content: input.content,
  };

  posts.add(post);
  return writeJson(ctx.response, 201, JsonSerializer.serialize<Post>(post));
};

export function main(): void {
  if (posts.count === 0) {
    posts.add({ id: nextId.value, title: "Hello, world", content: "Welcome to Tsonic + ASP.NET Core!" });
    nextId.value = nextId.value + 1;
  }

  const builder = WebApplication.createBuilder();
  const app = builder.build();

  EndpointRouteBuilderExtensions.mapGet(app, "/", handleIndex);
  EndpointRouteBuilderExtensions.mapGet(app, "/api/posts", handleListPosts);
  EndpointRouteBuilderExtensions.mapPost(app, "/api/posts", handleCreatePost);

  app.run("http://localhost:8090");
}
