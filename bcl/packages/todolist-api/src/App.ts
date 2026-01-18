// Todo List REST API
// Endpoints:
//   GET    /todos       - List all todos
//   GET    /todos/:id   - Get a specific todo
//   POST   /todos       - Create a new todo
//   PUT    /todos/:id   - Update a todo
//   DELETE /todos/:id   - Delete a todo

import { Console, Int32 } from "@tsonic/dotnet/System.js";
import { HttpListener, HttpListenerContext, HttpListenerRequest, HttpListenerResponse } from "@tsonic/dotnet/System.Net.js";
import { StreamReader, StreamWriter } from "@tsonic/dotnet/System.IO.js";
import { Encoding } from "@tsonic/dotnet/System.Text.js";
import { int, out } from "@tsonic/core/types.js";
import * as TodoStore from "./TodoStore.ts";
import { serializeTodo, serializeTodos, serializeError, parseTodoCreate, parseTodoUpdate } from "./JsonHelpers.ts";

// Extract ID from URL path like "/todos/123"
function extractIdFromPath(path: string): int | undefined {
  const parts = path.Split("/");
  // Expected: ["", "todos", "123"]
  // Check array bounds before accessing (C# arrays throw on out-of-bounds)
  if (parts.Length < 3) {
    return undefined;
  }
  const idStr = parts[2];
  if (idStr !== "") {
    // Use Int32.TryParse pattern - returns result via out parameter
    let parseResult: int = 0;
    const success = Int32.TryParse(idStr, parseResult as out<int>);
    if (success) {
      return parseResult;
    }
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

  Console.WriteLine(method + " " + path);

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

  Console.WriteLine("");
  Console.WriteLine("=================================");
  Console.WriteLine("  Todo List API Server");
  Console.WriteLine("  Running on http://localhost:8080");
  Console.WriteLine("=================================");
  Console.WriteLine("");
  Console.WriteLine("Endpoints:");
  Console.WriteLine("  GET    /todos       - List all todos");
  Console.WriteLine("  GET    /todos/:id   - Get a specific todo");
  Console.WriteLine("  POST   /todos       - Create a new todo");
  Console.WriteLine("  PUT    /todos/:id   - Update a todo");
  Console.WriteLine("  DELETE /todos/:id   - Delete a todo");
  Console.WriteLine("");
  Console.WriteLine("Press Ctrl+C to stop the server");
  Console.WriteLine("");

  // Request loop
  while (true) {
    const context = listener.GetContext();
    handleRequest(context);
  }
}
