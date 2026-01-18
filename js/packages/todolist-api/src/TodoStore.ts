// In-memory Todo storage with CRUD operations
// Uses JS Array semantics (push, filter, find, etc.)
import { List } from "@tsonic/dotnet/System.Collections.Generic.js";
import { console } from "@tsonic/js/index.js";
import { int } from "@tsonic/core/types.js";
import { Todo } from "./Todo.ts";

// Global store state (module-level variables)
const todos = new List<Todo>();
let nextId: int = 1;

// Get all todos
export function getAll(): Todo[] {
  return todos.ToArray();
}

// Get a todo by ID
export function getById(id: int): Todo | undefined {
  return todos.Find((t) => t.id === id);
}

// Create a new todo
export function create(title: string): Todo {
  const id = nextId;
  nextId = id + 1;

  const todo: Todo = {
    id,
    title,
    completed: false
  };

  todos.Add(todo);
  return todo;
}

export function update(id: int, title: string, completed: boolean): Todo | undefined {
  const index = todos.FindIndex((t) => t.id === id);
  if (index === -1) {
    return undefined;
  }

  const updated: Todo = {
    id,
    title,
    completed
  };

  todos.RemoveAt(index);
  todos.Insert(index, updated);
  return updated;
}

export function remove(id: int): boolean {
  const index = todos.FindIndex((t) => t.id === id);
  if (index === -1) {
    return false;
  }
  todos.RemoveAt(index);
  return true;
}

// Initialize with some sample data
export function initSampleData(): void {
  create("Learn TypeScript");
  create("Build a REST API");
  create("Test with curl");
  console.log("Sample data initialized with 3 todos");
}
