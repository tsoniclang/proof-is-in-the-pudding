// Todo data model
import { long } from "@tsonic/core/types.js";

export interface Todo {
  id: long;
  title: string;
  completed: boolean;
}
