import { int } from "@tsonic/core/types.js";
import { DateTime } from "@tsonic/dotnet/System.js";
import { List } from "@tsonic/dotnet/System.Collections.Generic.js";

export interface PostCreateInput {
  title: string;
  content: string;
}

export interface PostUpdateInput {
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

