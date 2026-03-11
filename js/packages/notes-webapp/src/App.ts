import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import type { int } from "@tsonic/core/types.js";
import { url } from "node:url";
import * as NotesStore from "./NotesStore.ts";
import {
  parseNoteCreate,
  parseNoteUpdate,
  serializeError,
  serializeNote,
  serializeNotes,
} from "./JsonHelpers.ts";

const INDEX_HTML = `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Tsonic Notes</title>
    <style>
      body { font-family: system-ui, -apple-system, Segoe UI, Roboto, sans-serif; margin: 2rem; line-height: 1.4; }
      header { display: flex; gap: 1rem; align-items: baseline; }
      .muted { color: #666; }
      .row { display: flex; gap: 0.75rem; align-items: center; }
      input, textarea, button { font: inherit; padding: 0.5rem 0.75rem; }
      textarea { width: 100%; height: 6rem; }
      button { cursor: pointer; }
      .card { border: 1px solid #ddd; border-radius: 10px; padding: 1rem; margin: 1rem 0; }
      .card h3 { margin: 0 0 0.5rem 0; }
      .meta { font-size: 0.9rem; color: #666; margin-bottom: 0.5rem; }
      .actions { display: flex; gap: 0.5rem; }
      .error { color: #b00020; }
    </style>
  </head>
  <body>
    <header>
      <h1>Tsonic Notes</h1>
      <span class="muted">HTML + JSON API, compiled TS → C# → NativeAOT</span>
    </header>

    <section class="card">
      <h2>Create Note</h2>
      <div class="row">
        <input id="title" placeholder="Title" style="flex: 1" />
      </div>
      <div style="margin-top: 0.75rem">
        <textarea id="content" placeholder="Write something..."></textarea>
      </div>
      <div class="row" style="margin-top: 0.75rem">
        <button id="create">Create</button>
        <span id="status" class="muted"></span>
      </div>
    </section>

    <section>
      <h2>Notes</h2>
      <div id="error" class="error"></div>
      <div id="notes"></div>
    </section>

    <script>
      const el = (id) => document.getElementById(id);

      const escapeHtml = (s) =>
        String(s)
          .replaceAll("&", "&amp;")
          .replaceAll("<", "&lt;")
          .replaceAll(">", "&gt;")
          .replaceAll("\"", "&quot;");

      async function api(path, options) {
        const res = await fetch(path, options);
        if (res.status === 204) return { ok: true, value: null };
        const text = await res.text();
        if (!res.ok) return { ok: false, error: text };
        return { ok: true, value: text ? JSON.parse(text) : null };
      }

      async function refresh() {
        el("error").textContent = "";
        const res = await api("/api/notes");
        if (!res.ok) {
          el("error").textContent = res.error;
          return;
        }
        const notes = res.value ?? [];
        const renderNote = (n) =>
          '<div class="card" data-id="' + n.id + '">' +
            "<h3>" + escapeHtml(n.title) + "</h3>" +
            '<div class="meta">Updated ' + escapeHtml(n.updatedAt) + "</div>" +
            '<pre style="white-space: pre-wrap; margin: 0 0 0.75rem 0">' +
              escapeHtml(n.content) +
            "</pre>" +
            '<div class="actions"><button class="delete">Delete</button></div>' +
          "</div>";
        el("notes").innerHTML = notes.map(renderNote).join("");
      }

      el("notes").addEventListener("click", async (e) => {
        const btn = e.target;
        if (!btn.classList.contains("delete")) return;
        const card = btn.closest(".card");
        const id = card.getAttribute("data-id");
        await api("/api/notes/" + id, { method: "DELETE" });
        await refresh();
      });

      el("create").addEventListener("click", async () => {
        el("status").textContent = "Creating...";
        const title = el("title").value;
        const content = el("content").value;
        const res = await api("/api/notes", {
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

function sendTextResponse(
  response: ServerResponse,
  statusCode: int,
  contentType: string,
  body: string
): void {
  response.statusCode = statusCode;
  response.setHeader("Content-Type", contentType);
  response.end(body);
}

function sendJsonResponse(
  response: ServerResponse,
  statusCode: int,
  json: string
): void {
  sendTextResponse(response, statusCode, "application/json; charset=utf-8", json);
}

function sendEmptyResponse(response: ServerResponse, statusCode: int): void {
  response.statusCode = statusCode;
  response.end();
}

async function readRequestBody(request: IncomingMessage): Promise<string> {
  return await request.readAll();
}

function extractNoteIdFromPath(pathname: string): number | undefined {
  const parts = pathname.split("/");
  if (parts.length < 4) {
    return undefined;
  }

  const idText = parts[3];
  if (idText === undefined || idText === "") {
    return undefined;
  }

  const parsed = parseInt(idText, 10);
  if (parsed === undefined || Number.isNaN(parsed)) {
    return undefined;
  }

  return parsed;
}

async function handleApi(request: IncomingMessage, response: ServerResponse): Promise<void> {
  const method = request.method ?? "GET";
  const parsedUrl = url.parse(request.url ?? "/");
  const path = parsedUrl?.pathname ?? "/";

  if (path === "/api/notes" && method === "GET") {
    sendJsonResponse(response, 200, serializeNotes(NotesStore.list()));
    return;
  }

  if (path === "/api/notes" && method === "POST") {
    const input = parseNoteCreate(await readRequestBody(request));
    if (input === undefined) {
      sendJsonResponse(
        response,
        400,
        serializeError("Invalid JSON: expected {\"title\": \"...\", \"content\": \"...\"}")
      );
      return;
    }

    const note = NotesStore.create(input);
    sendJsonResponse(response, 201, serializeNote(note));
    return;
  }

  if (!path.startsWith("/api/notes/")) {
    sendJsonResponse(response, 404, serializeError("Not found"));
    return;
  }

  const id = extractNoteIdFromPath(path);
  if (id === undefined) {
    sendJsonResponse(response, 400, serializeError("Invalid note id"));
    return;
  }

  if (method === "GET") {
    const note = NotesStore.getById(id);
    if (note === undefined) {
      sendJsonResponse(response, 404, serializeError("Note not found"));
      return;
    }

    sendJsonResponse(response, 200, serializeNote(note));
    return;
  }

  if (method === "PUT") {
    const input = parseNoteUpdate(await readRequestBody(request));
    if (input === undefined) {
      sendJsonResponse(
        response,
        400,
        serializeError("Invalid JSON: expected {\"title\": \"...\", \"content\": \"...\"}")
      );
      return;
    }

    const note = NotesStore.update(id, input);
    if (note === undefined) {
      sendJsonResponse(response, 404, serializeError("Note not found"));
      return;
    }

    sendJsonResponse(response, 200, serializeNote(note));
    return;
  }

  if (method === "DELETE") {
    if (!NotesStore.remove(id)) {
      sendJsonResponse(response, 404, serializeError("Note not found"));
      return;
    }

    sendEmptyResponse(response, 204);
    return;
  }

  sendJsonResponse(response, 405, serializeError("Method not allowed"));
}

async function handleRequest(request: IncomingMessage, response: ServerResponse): Promise<void> {
  const method = request.method ?? "GET";
  const parsedUrl = url.parse(request.url ?? "/");
  const path = parsedUrl?.pathname ?? "/";

  console.log(`${method} ${path}`);

  if (path === "/" && method === "GET") {
    sendTextResponse(response, 200, "text/html; charset=utf-8", INDEX_HTML);
    return;
  }

  if (path === "/healthz" && method === "GET") {
    sendTextResponse(response, 200, "text/plain; charset=utf-8", "ok");
    return;
  }

  if (path.startsWith("/api/")) {
    await handleApi(request, response);
    return;
  }

  sendTextResponse(response, 404, "text/plain; charset=utf-8", "Not found");
}

export function main(): void {
  NotesStore.seed();

  const server = createServer((request: IncomingMessage, response: ServerResponse) => {
    void handleRequest(request, response);
  });

  server.listen(8081, () => {
    console.log("");
    console.log("=================================");
    console.log("  Notes WebApp (JS surface + node:http)");
    console.log("  http://localhost:8081");
    console.log("=================================");
    console.log("");
  });

  setInterval(() => {}, 60000);
}
