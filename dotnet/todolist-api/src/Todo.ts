// Todo data model
import { int } from "@tsonic/core/types.js";

export interface Todo {
  id: int;
  title: string;
  completed: boolean;
}
