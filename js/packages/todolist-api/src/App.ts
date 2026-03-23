// Todo List REST API (JS surface + node:http)
//
// Endpoints:
//   GET    /todos       - List all todos
//   GET    /todos/:id   - Get a specific todo
//   POST   /todos       - Create a new todo
//   PUT    /todos/:id   - Update a todo
//   DELETE /todos/:id   - Delete a todo

import {
  createServer,
  type IncomingMessage,
  type ServerResponse,
} from "node:http";
import type { int } from "@tsonic/core/types.js";
import * as TodoStore from "./TodoStore.ts";
import {
  parseTodoCreate,
  parseTodoUpdate,
  serializeError,
  serializeTodo,
  serializeTodos,
} from "./JsonHelpers.ts";

function getRequestPath(requestUrl: string | null | undefined): string {
  const raw = requestUrl ?? "/";
  const queryIndex = raw.indexOf("?");
  if (queryIndex < 0) {
    return raw;
  }

  const pathname = raw.slice(0, queryIndex);
  return pathname === "" ? "/" : pathname;
}

function extractIdFromPath(pathname: string): number | undefined {
  const parts = pathname.split("/");
  if (parts.length < 3) {
    return undefined;
  }

  const idText = parts[2];
  if (idText === undefined || idText === "") {
    return undefined;
  }

  const parsed = parseInt(idText, 10);
  if (parsed === undefined || Number.isNaN(parsed)) {
    return undefined;
  }

  return parsed;
}

async function readRequestBody(request: IncomingMessage): Promise<string> {
  return await request.readAll();
}

function sendJsonResponse(response: ServerResponse, statusCode: int, json: string): void {
  response.statusCode = statusCode;
  response.setHeader("Content-Type", "application/json; charset=utf-8");
  response.end(json);
}

function handleGetAll(response: ServerResponse): void {
  sendJsonResponse(response, 200, serializeTodos(TodoStore.getAll()));
}

function handleGetOne(response: ServerResponse, id: number): void {
  const todo = TodoStore.getById(id);
  if (todo === undefined) {
    sendJsonResponse(response, 404, serializeError("Todo not found"));
    return;
  }

  sendJsonResponse(response, 200, serializeTodo(todo));
}

async function handleCreate(
  request: IncomingMessage,
  response: ServerResponse
): Promise<void> {
  const data = parseTodoCreate(await readRequestBody(request));
  if (data === undefined) {
    sendJsonResponse(response, 400, serializeError("Invalid JSON: expected {\"title\": \"...\"}"));
    return;
  }

  sendJsonResponse(response, 201, serializeTodo(TodoStore.create(data.title)));
}

async function handleUpdate(
  request: IncomingMessage,
  response: ServerResponse,
  id: number
): Promise<void> {
  const data = parseTodoUpdate(await readRequestBody(request));
  if (data === undefined) {
    sendJsonResponse(
      response,
      400,
      serializeError("Invalid JSON: expected {\"title\": \"...\", \"completed\": true/false}")
    );
    return;
  }

  const todo = TodoStore.update(id, data.title, data.completed);
  if (todo === undefined) {
    sendJsonResponse(response, 404, serializeError("Todo not found"));
    return;
  }

  sendJsonResponse(response, 200, serializeTodo(todo));
}

function handleDelete(response: ServerResponse, id: number): void {
  if (!TodoStore.remove(id)) {
    sendJsonResponse(response, 404, serializeError("Todo not found"));
    return;
  }

  response.statusCode = 204;
  response.end();
}

async function handleRequest(
  request: IncomingMessage,
  response: ServerResponse
): Promise<void> {
  const method = request.method ?? "GET";
  const path = getRequestPath(request.url);

  console.log(`${method} ${path}`);

  if (!path.startsWith("/todos")) {
    sendJsonResponse(response, 404, serializeError("Not found"));
    return;
  }

  const id = extractIdFromPath(path);

  if (method === "GET" && id === undefined) {
    handleGetAll(response);
    return;
  }

  if (method === "GET" && id !== undefined) {
    handleGetOne(response, id);
    return;
  }

  if (method === "POST" && id === undefined) {
    await handleCreate(request, response);
    return;
  }

  if (method === "PUT" && id !== undefined) {
    await handleUpdate(request, response, id);
    return;
  }

  if (method === "DELETE" && id !== undefined) {
    handleDelete(response, id);
    return;
  }

  sendJsonResponse(response, 405, serializeError("Method not allowed"));
}

export function main(): void {
  TodoStore.initSampleData();

  const server = createServer((request: IncomingMessage, response: ServerResponse) => {
    void handleRequest(request, response);
  });

  server.listen(8080, () => {
    console.log("");
    console.log("=================================");
    console.log("  Todo List API Server (JS surface + node:http)");
    console.log("  Running on http://localhost:8080");
    console.log("=================================");
    console.log("");
    console.log("Endpoints:");
    console.log("  GET    /todos       - List all todos");
    console.log("  GET    /todos/:id   - Get a specific todo");
    console.log("  POST   /todos       - Create a new todo");
    console.log("  PUT    /todos/:id   - Update a todo");
    console.log("  DELETE /todos/:id   - Delete a todo");
    console.log("");
    console.log("Press Ctrl+C to stop the server");
    console.log("");
  });

  setInterval(() => {}, 60000);
}
