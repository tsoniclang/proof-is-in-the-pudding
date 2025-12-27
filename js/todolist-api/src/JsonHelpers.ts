// JSON serialization helpers for Todo API
// Uses JS JSON.parse/stringify with generics
import { Todo } from "./Todo.ts";

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
  return JSON.stringify<Todo>(todo);
}

// Serialize an array of Todos to JSON string
export function serializeTodos(todos: Todo[]): string {
  return JSON.stringify<Todo[]>(todos);
}

// Parse JSON to extract title for creating a todo
// Expected format: {"title": "some title"}
export function parseTodoCreate(json: string): TodoCreateInput | undefined {
  const obj = JSON.parse<TodoCreateInput>(json);
  if (typeof obj.title !== "string") {
    return undefined;
  }
  return { title: obj.title };
}

// Parse JSON to extract update data
// Expected format: {"title": "new title", "completed": true}
export function parseTodoUpdate(json: string): TodoUpdateInput | undefined {
  const obj = JSON.parse<TodoUpdateInput>(json);
  if (typeof obj.title !== "string" || typeof obj.completed !== "boolean") {
    return undefined;
  }
  return {
    title: obj.title,
    completed: obj.completed
  };
}

// Create error response JSON
export function serializeError(message: string): string {
  return JSON.stringify<ErrorResponse>({ error: message });
}
