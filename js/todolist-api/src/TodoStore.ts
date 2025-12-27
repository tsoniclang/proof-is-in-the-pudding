// In-memory Todo storage with CRUD operations
// Uses JS Array semantics (push, filter, find, etc.)
import { int, long } from "@tsonic/core/types.js";
import { Todo } from "./Todo.ts";

// Type for mutable ID counter
interface IdCounter {
  value: long;
}

// Global store state (module-level variables)
const todos: Todo[] = [];
const nextId: IdCounter = { value: 1 as long };

// Get all todos
export function getAll(): Todo[] {
  return todos;
}

// Get a todo by ID
export function getById(id: long): Todo | undefined {
  return todos.find(t => t.id === id);
}

// Create a new todo
export function create(title: string): Todo {
  const id = nextId.value;
  nextId.value = id + 1;

  const todo: Todo = {
    id,
    title,
    completed: false
  };

  todos.push(todo);
  return todo;
}

// Update a todo
export function update(id: long, title: string, completed: boolean): Todo | undefined {
  const index = todos.findIndex(t => t.id === id);
  if (index === -1) {
    return undefined;
  }

  const updated: Todo = {
    id,
    title,
    completed
  };

  todos[index] = updated;
  return updated;
}

// Delete a todo
export function remove(id: long): boolean {
  const index = todos.findIndex(t => t.id === id);
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
