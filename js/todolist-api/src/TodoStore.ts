// In-memory Todo storage with CRUD operations
// Uses JS Array semantics (push, filter, find, etc.)
import { List } from "@tsonic/dotnet/System.Collections.Generic.js";
import { console } from "@tsonic/js/index.js";
import { long } from "@tsonic/core/types.js";
import { Todo } from "./Todo.ts";

// Global store state (module-level variables)
const todos = new List<Todo>();
let nextId: long = 1 as long;

// Get all todos
export function getAll(): Todo[] {
  return todos.toArray();
}

// Get a todo by ID
export function getById(id: long): Todo | undefined {
  return todos.find((t) => t.id === id);
}

// Create a new todo
export function create(title: string): Todo {
  const id = nextId;
  nextId = (id + 1) as long;

  const todo: Todo = {
    id,
    title,
    completed: false
  };

  todos.add(todo);
  return todo;
}

// Update a todo
export function update(id: long, title: string, completed: boolean): Todo | undefined {
  const index = todos.findIndex((t) => t.id === id);
  if (index === -1) {
    return undefined;
  }

  const updated: Todo = {
    id,
    title,
    completed
  };

  todos.removeAt(index);
  todos.insert(index, updated);
  return updated;
}

// Delete a todo
export function remove(id: long): boolean {
  const index = todos.findIndex((t) => t.id === id);
  if (index === -1) {
    return false;
  }
  todos.removeAt(index);
  return true;
}

// Initialize with some sample data
export function initSampleData(): void {
  create("Learn TypeScript");
  create("Build a REST API");
  create("Test with curl");
  console.log("Sample data initialized with 3 todos");
}
