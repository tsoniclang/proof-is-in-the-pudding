// Todo List REST API (JSRuntime bindings)
// Uses JS Array/String semantics with .NET HttpListener
//
// Endpoints:
//   GET    /todos       - List all todos
//   GET    /todos/:id   - Get a specific todo
//   POST   /todos       - Create a new todo
//   PUT    /todos/:id   - Update a todo
//   DELETE /todos/:id   - Delete a todo

import { console } from "@tsonic/js/index.js";
import { Int32 } from "@tsonic/dotnet/System.js";
import { HttpListener, HttpListenerContext, HttpListenerRequest, HttpListenerResponse } from "@tsonic/dotnet/System.Net.js";
import { StreamReader } from "@tsonic/dotnet/System.IO.js";
import { Encoding } from "@tsonic/dotnet/System.Text.js";
import { int, out } from "@tsonic/core/types.js";
import * as TodoStore from "./TodoStore.ts";
import { serializeTodo, serializeTodos, serializeError, parseTodoCreate, parseTodoUpdate } from "./JsonHelpers.ts";

// Extract ID from URL path like "/todos/123"
function extractIdFromPath(path: string): int | undefined {
  const parts = path.Split("/");
  // Expected: ["", "todos", "123"]
  if (parts.Length < 3) {
    return undefined;
  }
  const idStr = parts[2];
  if (idStr !== "") {
    let parseResult: int = 0;
    const ok = Int32.TryParse(idStr, parseResult as out<int>);
    if (ok) return parseResult;
  }
  return undefined;
}

// Read request body as string
function readRequestBody(request: HttpListenerRequest): string {
  const reader = new StreamReader(request.InputStream, Encoding.UTF8);
  const body = reader.ReadToEnd();
  reader.Close();
  return body;
}

// Send JSON response
function sendJsonResponse(response: HttpListenerResponse, statusCode: int, json: string): void {
  response.StatusCode = statusCode;
  response.ContentType = "application/json";

  const buffer = Encoding.UTF8.GetBytes(json);
  const bufferLength = buffer.Length;
  response.ContentLength64 = bufferLength;

  const output = response.OutputStream;
  output.Write(buffer, 0, bufferLength);
  output.Close();
  response.Close();
}

// Handle GET /todos - List all todos
function handleGetAll(response: HttpListenerResponse): void {
  const todos = TodoStore.getAll();
  const json = serializeTodos(todos);
  sendJsonResponse(response, 200, json);
}

// Handle GET /todos/:id - Get a specific todo
function handleGetOne(response: HttpListenerResponse, id: int): void {
  const todo = TodoStore.getById(id);
  if (todo === undefined) {
    sendJsonResponse(response, 404, serializeError("Todo not found"));
    return;
  }
  sendJsonResponse(response, 200, serializeTodo(todo));
}

// Handle POST /todos - Create a new todo
function handleCreate(request: HttpListenerRequest, response: HttpListenerResponse): void {
  const body = readRequestBody(request);
  const data = parseTodoCreate(body);

  if (data === undefined) {
    sendJsonResponse(response, 400, serializeError("Invalid JSON: expected {\"title\": \"...\"}"));
    return;
  }

  const todo = TodoStore.create(data.title);
  sendJsonResponse(response, 201, serializeTodo(todo));
}

// Handle PUT /todos/:id - Update a todo
function handleUpdate(request: HttpListenerRequest, response: HttpListenerResponse, id: int): void {
  const body = readRequestBody(request);
  const data = parseTodoUpdate(body);

  if (data === undefined) {
    sendJsonResponse(response, 400, serializeError("Invalid JSON: expected {\"title\": \"...\", \"completed\": true/false}"));
    return;
  }

  const todo = TodoStore.update(id, data.title, data.completed);
  if (todo === undefined) {
    sendJsonResponse(response, 404, serializeError("Todo not found"));
    return;
  }
  sendJsonResponse(response, 200, serializeTodo(todo));
}

// Handle DELETE /todos/:id - Delete a todo
function handleDelete(response: HttpListenerResponse, id: int): void {
  const deleted = TodoStore.remove(id);
  if (!deleted) {
    sendJsonResponse(response, 404, serializeError("Todo not found"));
    return;
  }
  sendJsonResponse(response, 204, "");
}

// Route request to appropriate handler
function handleRequest(context: HttpListenerContext): void {
  const request = context.Request;
  const response = context.Response;
  const method = request.HttpMethod;
  const url = request.Url;
  if (url === undefined) {
    sendJsonResponse(response, 400, serializeError("Invalid request URL"));
    return;
  }
  const path = url.AbsolutePath;

  console.log(method + " " + path);

  // Check if path starts with /todos
  if (!path.StartsWith("/todos")) {
    sendJsonResponse(response, 404, serializeError("Not found"));
    return;
  }

  // Extract ID if present
  const id = extractIdFromPath(path);

  // Route based on method and path
  if (method === "GET" && id === undefined) {
    // GET /todos
    handleGetAll(response);
  } else if (method === "GET" && id !== undefined) {
    // GET /todos/:id
    handleGetOne(response, id);
  } else if (method === "POST" && id === undefined) {
    // POST /todos
    handleCreate(request, response);
  } else if (method === "PUT" && id !== undefined) {
    // PUT /todos/:id
    handleUpdate(request, response, id);
  } else if (method === "DELETE" && id !== undefined) {
    // DELETE /todos/:id
    handleDelete(response, id);
  } else {
    sendJsonResponse(response, 405, serializeError("Method not allowed"));
  }
}

// Main entry point
export function main(): void {
  // Initialize sample data
  TodoStore.initSampleData();

  // Create and start HTTP listener
  const listener = new HttpListener();
  listener.Prefixes.Add("http://localhost:8080/");
  listener.Start();

  console.log("");
  console.log("=================================");
  console.log("  Todo List API Server (JSRuntime bindings)");
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

  // Request loop
  while (true) {
    const context = listener.GetContext();
    handleRequest(context);
  }
}
