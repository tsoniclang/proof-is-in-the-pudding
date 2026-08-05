import { DateTime } from "@tsonic/dotnet/System.js";
import { JsonSerializer } from "@tsonic/dotnet/System.Text.Json.js";
import { List } from "@tsonic/dotnet/System.Collections.Generic.js";
import { Queryable } from "@tsonic/dotnet/System.Linq.js";
import { TaskExtensions, type Task } from "@tsonic/dotnet/System.Threading.Tasks.js";
import { EntityFrameworkQueryableExtensions } from "@tsonic/dotnet/Microsoft.EntityFrameworkCore.js";

import type { HttpContext } from "@tsonic/dotnet/Microsoft.AspNetCore.Http.js";

import type { CommentDto, PostDetailDto, PostDto } from "../db/dtos.js";
import { PostEntity } from "../db/entities.js";
import type { CommentEntity } from "../db/entities.js";
import { BlogDbContext } from "../db/context.js";
import { DB_OPTIONS } from "../db/options.js";
import { toCommentDto, toPostDto } from "../db/mappers.js";
import { parsePostIdRequired, readRequestBodyAsync, serializeError, writeJson } from "../http/http-helpers.js";
import { parsePostInput } from "../http/json-input.js";

export const handleListPosts = (ctx: HttpContext): Task => {
  const db = new BlogDbContext(DB_OPTIONS);
  try {
    const query = Queryable.OrderByDescending(db.posts.AsQueryable(), (p) => p.CreatedAt);
    return TaskExtensions.Unwrap(
      EntityFrameworkQueryableExtensions.ToArrayAsync(query).ContinueWith<Task>((t, _state) => {
        try {
          const posts = t.Result;
          const result = new List<PostDto>();
          for (let i = 0; i < posts.Length; i++) {
            result.Add(toPostDto(posts[i]));
          }
          return writeJson(ctx.Response, 200, JsonSerializer.Serialize<List<PostDto>>(result));
        } finally {
          db.Dispose();
        }
      }, undefined)
    );
  } catch (error) {
    db.Dispose();
    throw error;
  }
};

export const handleGetPost = (ctx: HttpContext): Task => {
  const postIdRaw = parsePostIdRequired(ctx);
  if (postIdRaw === undefined) {
    return writeJson(ctx.Response, 400, serializeError("Missing post id"));
  }
  const postId = postIdRaw;

  const db = new BlogDbContext(DB_OPTIONS);
  try {
    const post = db.posts.Find(postId);
    if (post === undefined) {
      db.Dispose();
      return writeJson(ctx.Response, 404, serializeError("Post not found"));
    }
    const commentsQuery = Queryable.OrderByDescending<CommentEntity, DateTime>(
      db.comments.AsQueryable(),
      (c: CommentEntity): DateTime => c.CreatedAt
    );
    const commentsForPost = Queryable.Where(commentsQuery, (c: CommentEntity) => c.PostId === postId);
    return TaskExtensions.Unwrap(
      EntityFrameworkQueryableExtensions.ToArrayAsync(commentsForPost).ContinueWith<Task>((t, _state) => {
        try {
          const comments = t.Result;
          const commentDtos = new List<CommentDto>();
          for (let i = 0; i < comments.Length; i++) {
            commentDtos.Add(toCommentDto(comments[i]));
          }
          const dto: PostDetailDto = {
            id: post.Id,
            title: post.Title,
            content: post.Content,
            createdAt: post.CreatedAt,
            updatedAt: post.UpdatedAt,
            comments: commentDtos,
          };
          return writeJson(ctx.Response, 200, JsonSerializer.Serialize<PostDetailDto>(dto));
        } finally {
          db.Dispose();
        }
      }, undefined)
    );
  } catch (error) {
    db.Dispose();
    throw error;
  }
};

export const handleCreatePost = (ctx: HttpContext): Task =>
  TaskExtensions.Unwrap(
    readRequestBodyAsync(ctx).ContinueWith<Task>((t: Task<string>, _state) => {
      const input = parsePostInput(t.Result);
      if (input === undefined) {
        return writeJson(
          ctx.Response,
          400,
          serializeError("Invalid JSON: expected {\"title\": \"...\", \"content\": \"...\"}")
        );
      }

      let payload = "";
      const db = new BlogDbContext(DB_OPTIONS);
      try {
        const now = DateTime.UtcNow;
        const post = new PostEntity();
        post.Title = input.title;
        post.Content = input.content;
        post.CreatedAt = now;
        post.UpdatedAt = now;
        db.posts.Add(post);
        db.SaveChanges();
        payload = JsonSerializer.Serialize<PostDto>(toPostDto(post));
      } finally {
        db.Dispose();
      }

      return writeJson(ctx.Response, 201, payload);
    }, undefined)
  );

export const handleUpdatePost = (ctx: HttpContext): Task => {
  const postIdRaw = parsePostIdRequired(ctx);
  if (postIdRaw === undefined) {
    return writeJson(ctx.Response, 400, serializeError("Missing post id"));
  }
  const postId = postIdRaw;

  return TaskExtensions.Unwrap(
    readRequestBodyAsync(ctx).ContinueWith<Task>((t: Task<string>, _state) => {
      const input = parsePostInput(t.Result);
      if (input === undefined) {
        return writeJson(
          ctx.Response,
          400,
          serializeError("Invalid JSON: expected {\"title\": \"...\", \"content\": \"...\"}")
        );
      }

      let payload: string | undefined = undefined;
      const db = new BlogDbContext(DB_OPTIONS);
      try {
        const post = db.posts.Find(postId);
        if (post !== undefined) {
          post.Title = input.title;
          post.Content = input.content;
          post.UpdatedAt = DateTime.UtcNow;
          db.SaveChanges();
          payload = JsonSerializer.Serialize<PostDto>(toPostDto(post));
        }
      } finally {
        db.Dispose();
      }

      if (payload === undefined) {
        return writeJson(ctx.Response, 404, serializeError("Post not found"));
      }

      return writeJson(ctx.Response, 200, payload);
    }, undefined)
  );
};

export const handleDeletePost = (ctx: HttpContext): Task => {
  const postIdRaw = parsePostIdRequired(ctx);
  if (postIdRaw === undefined) {
    return writeJson(ctx.Response, 400, serializeError("Missing post id"));
  }
  const postId = postIdRaw;

  let ok = false;
  const db = new BlogDbContext(DB_OPTIONS);
  try {
    const post = db.posts.Find(postId);
    if (post !== undefined) {
      db.Remove(post);
      db.SaveChanges();
      ok = true;
    }
  } finally {
    db.Dispose();
  }

  if (!ok) {
    return writeJson(ctx.Response, 404, serializeError("Post not found"));
  }

  return writeJson(ctx.Response, 204, "");
};
