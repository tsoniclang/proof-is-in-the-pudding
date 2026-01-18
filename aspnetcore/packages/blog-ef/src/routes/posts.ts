import { DateTime } from "@tsonic/dotnet/System.js";
import { JsonSerializer } from "@tsonic/dotnet/System.Text.Json.js";
import { List } from "@tsonic/dotnet/System.Collections.Generic.js";
import { Enumerable, Queryable } from "@tsonic/dotnet/System.Linq.js";
import { Task, TaskExtensions } from "@tsonic/dotnet/System.Threading.Tasks.js";

import { HttpContext } from "@tsonic/aspnetcore/Microsoft.AspNetCore.Http.js";

import type { CommentDto, PostCreateInput, PostDetailDto, PostDto, PostUpdateInput } from "../db/dtos.ts";
import type { CommentEntity, PostEntity } from "../db/entities.ts";
import { BlogDbContext } from "../db/context.ts";
import { DB_OPTIONS } from "../db/options.ts";
import { toCommentDto, toPostDto } from "../db/mappers.ts";
import { parsePostIdRequired, readRequestBodyAsync, serializeError, unwrapInt, writeJson } from "../http/http-helpers.ts";

export const handleListPosts = (ctx: HttpContext): Task => {
  let payload = "";
  const db = new BlogDbContext(DB_OPTIONS);
  try {
    const query = Queryable.OrderByDescending(db.posts.AsQueryable(), (p) => p.CreatedAt);
    const list = Enumerable.ToList(query);
    const posts = list.ToArray();

    const result = new List<PostDto>();
    for (let i = 0; i < posts.Length; i++) {
      result.Add(toPostDto(posts[i]));
    }
    payload = JsonSerializer.Serialize<List<PostDto>>(result);
  } finally {
    db.Dispose();
  }

  return writeJson(ctx.Response, 200, payload);
};

export const handleGetPost = (ctx: HttpContext): Task => {
  const postIdRaw = parsePostIdRequired(ctx);
  if (postIdRaw === undefined) {
    return writeJson(ctx.Response, 400, serializeError("Missing post id"));
  }
  const postId = unwrapInt(postIdRaw);

  let payload: string | undefined = undefined;
  const db = new BlogDbContext(DB_OPTIONS);
  try {
    const post = db.posts.Find(postId);
    if (post !== undefined) {
      const commentsQuery = Queryable.OrderByDescending<CommentEntity, DateTime>(
        db.comments.AsQueryable(),
        (c: CommentEntity): DateTime => c.CreatedAt
      );
      const commentsForPost = Queryable.Where(commentsQuery, (c: CommentEntity) => c.PostId === postId);
      const comments = Enumerable.ToList(commentsForPost).ToArray();

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

      payload = JsonSerializer.Serialize<PostDetailDto>(dto);
    }
  } finally {
    db.Dispose();
  }

  if (payload === undefined) {
    return writeJson(ctx.Response, 404, serializeError("Post not found"));
  }

  return writeJson(ctx.Response, 200, payload);
};

export const handleCreatePost = (ctx: HttpContext): Task =>
  TaskExtensions.Unwrap(
    readRequestBodyAsync(ctx).ContinueWith<Task>((t: Task<string>, _state) => {
      const input = JsonSerializer.Deserialize<PostCreateInput>(t.Result);
      if (input === undefined || typeof input.title !== "string" || typeof input.content !== "string") {
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
        const post: PostEntity = {
          Id: 0,
          Title: input.title,
          Content: input.content,
          CreatedAt: now,
          UpdatedAt: now,
        };
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
  const postId = unwrapInt(postIdRaw);

  return TaskExtensions.Unwrap(
    readRequestBodyAsync(ctx).ContinueWith<Task>((t: Task<string>, _state) => {
      const input = JsonSerializer.Deserialize<PostUpdateInput>(t.Result);
      if (input === undefined || typeof input.title !== "string" || typeof input.content !== "string") {
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
  const postId = unwrapInt(postIdRaw);

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
