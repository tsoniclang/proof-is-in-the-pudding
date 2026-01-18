// JSON serialization helpers for Todo API
// Uses idiomatic System.Text.Json.JsonSerializer
import { JsonSerializer } from "@tsonic/dotnet/System.Text.Json.js";
import { List } from "@tsonic/dotnet/System.Collections.Generic.js";
import { Todo } from "./Todo.ts";

// Named types for JSON parsing (exported for C# type generation)
export interface TodoCreateInput {
  title: string;
}

export interface TodoUpdateInput {
  title: string;
  completed: boolean;
}

export interface ErrorResponse {
  error: string;
}

// Serialize a Todo to JSON string
export function serializeTodo(todo: Todo): string {
  return JsonSerializer.Serialize<Todo>(todo);
}

// Serialize a list of Todos to JSON string
export function serializeTodos(todos: List<Todo>): string {
  return JsonSerializer.Serialize<List<Todo>>(todos);
}

// Parse JSON to extract title for creating a todo
// Expected format: {"title": "some title"}
export function parseTodoCreate(json: string): TodoCreateInput | undefined {
  const obj = JsonSerializer.Deserialize<TodoCreateInput>(json);
  if (obj === undefined || typeof obj.title !== "string") {
    return undefined;
  }
  return { title: obj.title };
}

// Parse JSON to extract update data
// Expected format: {"title": "new title", "completed": true}
export function parseTodoUpdate(json: string): TodoUpdateInput | undefined {
  const obj = JsonSerializer.Deserialize<TodoUpdateInput>(json);
  if (obj === undefined || typeof obj.title !== "string" || typeof obj.completed !== "boolean") {
    return undefined;
  }
  return {
    title: obj.title,
    completed: obj.completed
  };
}

// Create error response JSON
export function serializeError(message: string): string {
  return JsonSerializer.Serialize<ErrorResponse>({ error: message });
}
