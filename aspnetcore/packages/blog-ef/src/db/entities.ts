import type { int } from "@tsonic/csharp/types.js";
import { DateTime } from "@tsonic/dotnet/System.js";

interface PostEntityProperties {
  Id: int;
  Title: string;
  Content: string;
  CreatedAt: DateTime;
  UpdatedAt: DateTime;
}

interface CommentEntityProperties {
  Id: int;
  PostId: int;
  Author: string;
  Body: string;
  CreatedAt: DateTime;
}

export class PostEntity implements PostEntityProperties {
  Id: int = 0;
  Title = "";
  Content = "";
  CreatedAt: DateTime = DateTime.MinValue;
  UpdatedAt: DateTime = DateTime.MinValue;
}

export class CommentEntity implements CommentEntityProperties {
  Id: int = 0;
  PostId: int = 0;
  Author = "";
  Body = "";
  CreatedAt: DateTime = DateTime.MinValue;
}
