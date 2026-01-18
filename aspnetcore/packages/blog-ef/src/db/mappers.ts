import type { CommentEntity, PostEntity } from "./entities.ts";
import type { CommentDto, PostDto } from "./dtos.ts";

export const toPostDto = (p: PostEntity): PostDto => ({
  id: p.Id,
  title: p.Title,
  content: p.Content,
  createdAt: p.CreatedAt,
  updatedAt: p.UpdatedAt,
});

export const toCommentDto = (c: CommentEntity): CommentDto => ({
  id: c.Id,
  postId: c.PostId,
  author: c.Author,
  body: c.Body,
  createdAt: c.CreatedAt,
});

