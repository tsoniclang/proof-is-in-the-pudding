import type { int } from "@tsonic/csharp/types.js";
import type { DateTime } from "@tsonic/dotnet/System.js";
import type { List } from "@tsonic/dotnet/System.Collections.Generic.js";

export interface PostInput {
  title: string;
  content: string;
}

export interface CommentCreateInput {
  author: string;
  body: string;
}

export interface ErrorResponse {
  error: string;
}

export interface HealthResponse {
  ok: boolean;
}

export interface PostDto {
  id: int;
  title: string;
  content: string;
  createdAt: DateTime;
  updatedAt: DateTime;
}

export interface CommentDto {
  id: int;
  postId: int;
  author: string;
  body: string;
  createdAt: DateTime;
}

export interface PostDetailDto extends PostDto {
  comments: List<CommentDto>;
}
