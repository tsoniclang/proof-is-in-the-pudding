import type { int } from "@tsonic/csharp/types.js";
import { DateTime } from "@tsonic/dotnet/System.js";

export class PostEntity {
  Id: int = 0;
  Title = "";
  Content = "";
  CreatedAt: DateTime = DateTime.MinValue;
  UpdatedAt: DateTime = DateTime.MinValue;
}

export class CommentEntity {
  Id: int = 0;
  PostId: int = 0;
  Author = "";
  Body = "";
  CreatedAt: DateTime = DateTime.MinValue;
}
