import { Console } from "@tsonic/dotnet/System.js";
import { TodoItem } from "@acme/domain/Acme.Domain.js";

export function main(): void {
  const item = new TodoItem("1", "Make npm workspaces work in Tsonic");
  Console.WriteLine(item.toString());

  item.toggle();
  Console.WriteLine(item.toString());
}
