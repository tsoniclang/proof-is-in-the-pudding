// JSON serialization helpers for Todo API
import { JsonElement, JsonDocument, JsonValueKind } from "@tsonic/dotnet/System.Text.Json.js";
import { List } from "@tsonic/dotnet/System.Collections.Generic.js";
import { String as ClrString } from "@tsonic/dotnet/System.js";
import { int } from "@tsonic/core/types.js";
import { Todo } from "./Todo.ts";

// Serialize a Todo to JSON string
export function serializeTodo(todo: Todo): string {
  return `{"id":${todo.id},"title":"${escapeJsonString(todo.title)}","completed":${todo.completed}}`;
}

// Serialize a list of Todos to JSON string
export function serializeTodos(todos: List<Todo>): string {
  const items = new List<string>();
  const enumerator = todos.getEnumerator();
  while (enumerator.moveNext()) {
    items.add(serializeTodo(enumerator.current));
  }
  return "[" + ClrString.join(",", items) + "]";
}

// Escape special characters in JSON strings
function escapeJsonString(str: string): string {
  // Basic escaping - handle backslash, quotes, and control characters
  let result = "";
  for (let i = 0 as int; i < str.length; i = (i + 1) as int) {
    const char = str[i];
    if (char === '"') {
      result = result + '\\"';
    } else if (char === '\\') {
      result = result + '\\\\';
    } else if (char === '\n') {
      result = result + '\\n';
    } else if (char === '\r') {
      result = result + '\\r';
    } else if (char === '\t') {
      result = result + '\\t';
    } else {
      result = result + char;
    }
  }
  return result;
}

// Parse JSON to extract title for creating a todo
// Expected format: {"title": "some title"}
export function parseTodoCreate(json: string): { title: string } | undefined {
  const doc = JsonDocument.parse(json);
  const root = doc.rootElement;

  if (root.valueKind !== JsonValueKind.object_) {
    return undefined;
  }

  const titleProp = root.getProperty("title");
  if (titleProp.valueKind !== JsonValueKind.string_) {
    return undefined;
  }

  const title = titleProp.getString();
  if (title === undefined) {
    return undefined;
  }
  return { title };
}

// Parse JSON to extract update data
// Expected format: {"title": "new title", "completed": true}
export function parseTodoUpdate(json: string): { title: string; completed: boolean } | undefined {
  const doc = JsonDocument.parse(json);
  const root = doc.rootElement;

  if (root.valueKind !== JsonValueKind.object_) {
    return undefined;
  }

  const titleProp = root.getProperty("title");
  if (titleProp.valueKind !== JsonValueKind.string_) {
    return undefined;
  }

  const completedProp = root.getProperty("completed");
  if (completedProp.valueKind !== JsonValueKind.true_ && completedProp.valueKind !== JsonValueKind.false_) {
    return undefined;
  }

  const title = titleProp.getString();
  if (title === undefined) {
    return undefined;
  }
  return {
    title,
    completed: completedProp.getBoolean()
  };
}

// Create error response JSON
export function serializeError(message: string): string {
  return `{"error":"${escapeJsonString(message)}"}`;
}
