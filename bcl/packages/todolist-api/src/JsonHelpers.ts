// JSON serialization helpers for Todo API
// Uses idiomatic System.Text.Json.JsonSerializer
import { JsonDocument, JsonException, JsonSerializer, JsonValueKind } from "@tsonic/dotnet/System.Text.Json.js";
import { List } from "@tsonic/dotnet/System.Collections.Generic.js";
import { Todo } from "./Todo.js";

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

function tryParseJsonDocument(json: string): JsonDocument | undefined {
  try {
    return JsonDocument.Parse(json);
  } catch (error) {
    if (error instanceof JsonException) return undefined;
    throw error;
  }
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
  const document = tryParseJsonDocument(json);
  if (document === undefined) return undefined;
  try {
    const root = document.RootElement;
    if (root.ValueKind !== JsonValueKind.Object) return undefined;

    const properties = root.EnumerateObject().GetEnumerator();
    while (properties.MoveNext()) {
      const property = properties.Current;
      if (property.Name === "title" && property.Value.ValueKind === JsonValueKind.String) {
        const title = property.Value.GetString();
        if (title !== undefined) return { title };
      }
    }
    return undefined;
  } finally {
    document.Dispose();
  }
}

// Parse JSON to extract update data
// Expected format: {"title": "new title", "completed": true}
export function parseTodoUpdate(json: string): TodoUpdateInput | undefined {
  const document = tryParseJsonDocument(json);
  if (document === undefined) return undefined;
  try {
    const root = document.RootElement;
    if (root.ValueKind !== JsonValueKind.Object) return undefined;

    let title: string | undefined = undefined;
    let completed: boolean | undefined = undefined;
    const properties = root.EnumerateObject().GetEnumerator();
    while (properties.MoveNext()) {
      const property = properties.Current;
      if (property.Name === "title" && property.Value.ValueKind === JsonValueKind.String) {
        const value = property.Value.GetString();
        if (value !== undefined) title = value;
      } else if (property.Name === "completed" && property.Value.ValueKind === JsonValueKind.True) {
        completed = true;
      } else if (property.Name === "completed" && property.Value.ValueKind === JsonValueKind.False) {
        completed = false;
      }
    }
    if (title === undefined || completed === undefined) return undefined;
    return { title, completed };
  } finally {
    document.Dispose();
  }
}

// Create error response JSON
export function serializeError(message: string): string {
  return JsonSerializer.Serialize<ErrorResponse>({ error: message });
}
