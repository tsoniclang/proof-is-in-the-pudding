import { int } from "@tsonic/csharp/types.js";
import { DateTime } from "@tsonic/dotnet/System.js";

export interface PostEntity {
  Id: int;
  Title: string;
  Content: string;
  CreatedAt: DateTime;
  UpdatedAt: DateTime;
}

export interface CommentEntity {
  Id: int;
  PostId: int;
  Author: string;
  Body: string;
  CreatedAt: DateTime;
}

