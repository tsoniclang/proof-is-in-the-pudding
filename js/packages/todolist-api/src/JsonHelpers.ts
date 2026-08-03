// JSON serialization helpers for Todo API
// Uses standard JS JSON.parse/stringify with runtime shape checks
import { Todo } from "./Todo.js";

// Named types for JSON parsing/serialization (exported for C# accessibility)
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
  return JSON.stringify(todo);
}

// Serialize an array of Todos to JSON string
export function serializeTodos(todos: Todo[]): string {
  return JSON.stringify(todos);
}

// Parse JSON to extract title for creating a todo
// Expected format: {"title": "some title"}
export function parseTodoCreate(json: string): TodoCreateInput | undefined {
  try {
    const obj = JSON.parse(json) as { title?: unknown };
    if (typeof obj.title !== "string") {
      return undefined;
    }
    return { title: obj.title };
  } catch {
    return undefined;
  }
}

// Parse JSON to extract update data
// Expected format: {"title": "new title", "completed": true}
export function parseTodoUpdate(json: string): TodoUpdateInput | undefined {
  try {
    const obj = JSON.parse(json) as { title?: unknown; completed?: unknown };
    if (typeof obj.title !== "string" || typeof obj.completed !== "boolean") {
      return undefined;
    }
    return {
      title: obj.title,
      completed: obj.completed
    };
  } catch {
    return undefined;
  }
}

// Create error response JSON
export function serializeError(message: string): string {
  return JSON.stringify({ error: message });
}
