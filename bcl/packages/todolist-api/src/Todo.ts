// Todo data model
import { int } from "@tsonic/csharp/types.js";

export interface Todo {
  id: int;
  title: string;
  completed: boolean;
}
