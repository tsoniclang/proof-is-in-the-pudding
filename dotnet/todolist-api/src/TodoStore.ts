// In-memory Todo storage with CRUD operations
import { Console } from "@tsonic/dotnet/System.js";
import { List, Dictionary } from "@tsonic/dotnet/System.Collections.Generic.js";
import { int } from "@tsonic/core/types.js";
import { Todo } from "./Todo.ts";

// Global store state (module-level variables)
const todos = new Dictionary<int, Todo>();
const nextId: { value: int } = { value: 1 as int };

// Get all todos
export function getAll(): List<Todo> {
  const result = new List<Todo>();
  const values = todos.values;
  const enumerator = values.getEnumerator();
  while (enumerator.moveNext()) {
    result.add(enumerator.current);
  }
  return result;
}

// Get a todo by ID
export function getById(id: int): Todo | undefined {
  if (todos.containsKey(id)) {
    return todos[id];
  }
  return undefined;
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

  todos.add(id, todo);
  return todo;
}

// Update a todo
export function update(id: int, title: string, completed: boolean): Todo | undefined {
  const existing = getById(id);
  if (existing === undefined) {
    return undefined;
  }

  const updated: Todo = {
    id,
    title,
    completed
  };

  todos[id] = updated;
  return updated;
}

// Delete a todo
export function remove(id: int): boolean {
  return todos.remove(id);
}

// Initialize with some sample data
export function initSampleData(): void {
  create("Learn TypeScript");
  create("Build a REST API");
  create("Test with curl");
  Console.writeLine("Sample data initialized with 3 todos");
}
