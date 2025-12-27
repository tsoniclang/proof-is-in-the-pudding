// Todo List REST API (JS mode)
// Uses JS Array/String semantics with .NET HttpListener
//
// Endpoints:
//   GET    /todos       - List all todos
//   GET    /todos/:id   - Get a specific todo
//   POST   /todos       - Create a new todo
//   PUT    /todos/:id   - Update a todo
//   DELETE /todos/:id   - Delete a todo

import { HttpListener, HttpListenerContext, HttpListenerRequest, HttpListenerResponse } from "@tsonic/dotnet/System.Net.js";
import { StreamReader, StreamWriter } from "@tsonic/dotnet/System.IO.js";
import { Encoding } from "@tsonic/dotnet/System.Text.js";
import { int, long } from "@tsonic/core/types.js";
import * as TodoStore from "./TodoStore.ts";
import { serializeTodo, serializeTodos, serializeError, parseTodoCreate, parseTodoUpdate } from "./JsonHelpers.ts";

// Extract ID from URL path like "/todos/123"
function extractIdFromPath(path: string): long | undefined {
  const parts = path.split("/");
  // Expected: ["", "todos", "123"]
  if (parts.length < 3) {
    return undefined;
  }
  const idStr = parts[2];
  if (idStr !== "") {
    const parsed = Number.parseInt(idStr, 10);
    if (parsed !== undefined) {
      return parsed;
    }
  }
  return undefined;
}

// Read request body as string
function readRequestBody(request: HttpListenerRequest): string {
  const reader = new StreamReader(request.inputStream, Encoding.UTF8);
  const body = reader.readToEnd();
  reader.close();
  return body;
}

// Send JSON response
function sendJsonResponse(response: HttpListenerResponse, statusCode: int, json: string): void {
  response.statusCode = statusCode;
  response.contentType = "application/json";

  const buffer = Encoding.UTF8.getBytes(json);
  const bufferLength = Encoding.UTF8.getByteCount(json) as int;
  response.contentLength64 = bufferLength;

  const output = response.outputStream;
  output.write(buffer, 0, bufferLength);
  output.close();
  response.close();
}

// Handle GET /todos - List all todos
function handleGetAll(response: HttpListenerResponse): void {
  const todos = TodoStore.getAll();
  const json = serializeTodos(todos);
  sendJsonResponse(response, 200, json);
}

// Handle GET /todos/:id - Get a specific todo
function handleGetOne(response: HttpListenerResponse, id: long): void {
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
function handleUpdate(request: HttpListenerRequest, response: HttpListenerResponse, id: long): void {
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
function handleDelete(response: HttpListenerResponse, id: long): void {
  const deleted = TodoStore.remove(id);
  if (!deleted) {
    sendJsonResponse(response, 404, serializeError("Todo not found"));
    return;
  }
  sendJsonResponse(response, 204, "");
}

// Route request to appropriate handler
function handleRequest(context: HttpListenerContext): void {
  const request = context.request;
  const response = context.response;
  const method = request.httpMethod;
  const url = request.url;
  if (url === undefined) {
    sendJsonResponse(response, 400, serializeError("Invalid request URL"));
    return;
  }
  const path = url.absolutePath;

  console.log(method + " " + path);

  // Check if path starts with /todos
  if (!path.startsWith("/todos")) {
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
  listener.prefixes.add("http://localhost:8080/");
  listener.start();

  console.log("");
  console.log("=================================");
  console.log("  Todo List API Server (JS mode)");
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
    const context = listener.getContext();
    handleRequest(context);
  }
}
