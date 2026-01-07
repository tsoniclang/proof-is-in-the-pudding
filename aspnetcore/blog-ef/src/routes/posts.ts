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
    const query = Queryable.orderByDescending(db.posts.asQueryable(), (p) => p.CreatedAt);
    const list = Enumerable.toList(query);
    const posts = list.toArray();

    const result = new List<PostDto>();
    for (let i = 0; i < posts.length; i++) {
      result.add(toPostDto(posts[i]));
    }
    payload = JsonSerializer.serialize<List<PostDto>>(result);
  } finally {
    db.dispose();
  }

  return writeJson(ctx.response, 200, payload);
};

export const handleGetPost = (ctx: HttpContext): Task => {
  const postIdRaw = parsePostIdRequired(ctx);
  if (postIdRaw === undefined) {
    return writeJson(ctx.response, 400, serializeError("Missing post id"));
  }
  const postId = unwrapInt(postIdRaw);

  let payload: string | undefined = undefined;
  const db = new BlogDbContext(DB_OPTIONS);
  try {
    const post = db.posts.find(postId);
    if (post !== undefined) {
      const commentsQuery = Queryable.orderBy(db.comments.asQueryable(), (c: CommentEntity) => c.CreatedAt);
      const commentsForPost = Queryable.where(commentsQuery, (c: CommentEntity) => c.PostId === postId);
      const comments = Enumerable.toList(commentsForPost).toArray();

      const commentDtos = new List<CommentDto>();
      for (let i = 0; i < comments.length; i++) {
        commentDtos.add(toCommentDto(comments[i]));
      }

      const dto: PostDetailDto = {
        id: post.Id,
        title: post.Title,
        content: post.Content,
        createdAt: post.CreatedAt,
        updatedAt: post.UpdatedAt,
        comments: commentDtos,
      };

      payload = JsonSerializer.serialize<PostDetailDto>(dto);
    }
  } finally {
    db.dispose();
  }

  if (payload === undefined) {
    return writeJson(ctx.response, 404, serializeError("Post not found"));
  }

  return writeJson(ctx.response, 200, payload);
};

export const handleCreatePost = (ctx: HttpContext): Task =>
  TaskExtensions.unwrap(
    readRequestBodyAsync(ctx).continueWith<Task>((t: Task<string>, _state) => {
      const input = JsonSerializer.deserialize<PostCreateInput>(t.result);
      if (input === undefined || typeof input.title !== "string" || typeof input.content !== "string") {
        return writeJson(
          ctx.response,
          400,
          serializeError("Invalid JSON: expected {\"title\": \"...\", \"content\": \"...\"}")
        );
      }

      let payload = "";
      const db = new BlogDbContext(DB_OPTIONS);
      try {
        const now = DateTime.utcNow;
        const post: PostEntity = {
          Id: 0,
          Title: input.title,
          Content: input.content,
          CreatedAt: now,
          UpdatedAt: now,
        };
        db.posts.add(post);
        db.saveChanges();
        payload = JsonSerializer.serialize<PostDto>(toPostDto(post));
      } finally {
        db.dispose();
      }

      return writeJson(ctx.response, 201, payload);
    }, undefined)
  );

export const handleUpdatePost = (ctx: HttpContext): Task => {
  const postIdRaw = parsePostIdRequired(ctx);
  if (postIdRaw === undefined) {
    return writeJson(ctx.response, 400, serializeError("Missing post id"));
  }
  const postId = unwrapInt(postIdRaw);

  return TaskExtensions.unwrap(
    readRequestBodyAsync(ctx).continueWith<Task>((t: Task<string>, _state) => {
      const input = JsonSerializer.deserialize<PostUpdateInput>(t.result);
      if (input === undefined || typeof input.title !== "string" || typeof input.content !== "string") {
        return writeJson(
          ctx.response,
          400,
          serializeError("Invalid JSON: expected {\"title\": \"...\", \"content\": \"...\"}")
        );
      }

      let payload: string | undefined = undefined;
      const db = new BlogDbContext(DB_OPTIONS);
      try {
        const post = db.posts.find(postId);
        if (post !== undefined) {
          post.Title = input.title;
          post.Content = input.content;
          post.UpdatedAt = DateTime.utcNow;
          db.saveChanges();
          payload = JsonSerializer.serialize<PostDto>(toPostDto(post));
        }
      } finally {
        db.dispose();
      }

      if (payload === undefined) {
        return writeJson(ctx.response, 404, serializeError("Post not found"));
      }

      return writeJson(ctx.response, 200, payload);
    }, undefined)
  );
};

export const handleDeletePost = (ctx: HttpContext): Task => {
  const postIdRaw = parsePostIdRequired(ctx);
  if (postIdRaw === undefined) {
    return writeJson(ctx.response, 400, serializeError("Missing post id"));
  }
  const postId = unwrapInt(postIdRaw);

  let ok = false;
  const db = new BlogDbContext(DB_OPTIONS);
  try {
    const post = db.posts.find(postId);
    if (post !== undefined) {
      db.posts.remove(post);
      db.saveChanges();
      ok = true;
    }
  } finally {
    db.dispose();
  }

  if (!ok) {
    return writeJson(ctx.response, 404, serializeError("Post not found"));
  }

  return writeJson(ctx.response, 204, "");
};
