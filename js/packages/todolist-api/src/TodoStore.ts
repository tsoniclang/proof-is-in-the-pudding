// In-memory Todo storage with CRUD operations
// Uses JS Array semantics (push, find, splice, etc.)
import { int } from "@tsonic/core/types.js";
import { Todo } from "./Todo.ts";

// Global store state (module-level variables)
const todos: Todo[] = [];
let nextId: int = 1;

// Get all todos
export function getAll(): Todo[] {
  return todos.slice();
}

// Get a todo by ID
export function getById(id: int): Todo | undefined {
  return todos.find((t) => t.id === id);
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

  todos.push(todo);
  return todo;
}

export function update(id: int, title: string, completed: boolean): Todo | undefined {
  const index = todos.findIndex((t) => t.id === id);
  if (index === -1) {
    return undefined;
  }

  const updated: Todo = {
    id,
    title,
    completed
  };

  todos.splice(index, 1, updated);
  return updated;
}

export function remove(id: int): boolean {
  const index = todos.findIndex((t) => t.id === id);
  if (index === -1) {
    return false;
  }
  todos.splice(index, 1);
  return true;
}

// Initialize with some sample data
export function initSampleData(): void {
  create("Learn TypeScript");
  create("Build a REST API");
  create("Test with curl");
  console.log("Sample data initialized with 3 todos");
}
