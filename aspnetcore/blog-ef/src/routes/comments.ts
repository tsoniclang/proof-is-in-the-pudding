import { DateTime } from "@tsonic/dotnet/System.js";
import { JsonSerializer } from "@tsonic/dotnet/System.Text.Json.js";
import { List } from "@tsonic/dotnet/System.Collections.Generic.js";
import { Enumerable, Queryable } from "@tsonic/dotnet/System.Linq.js";
import { Task, TaskExtensions } from "@tsonic/dotnet/System.Threading.Tasks.js";

import { HttpContext } from "@tsonic/aspnetcore/Microsoft.AspNetCore.Http.js";

import type { CommentCreateInput, CommentDto } from "../db/dtos.ts";
import type { CommentEntity } from "../db/entities.ts";
import { BlogDbContext } from "../db/context.ts";
import { DB_OPTIONS } from "../db/options.ts";
import { toCommentDto } from "../db/mappers.ts";
import { parsePostIdRequired, readRequestBodyAsync, serializeError, unwrapInt, writeJson } from "../http/http-helpers.ts";

export const handleListComments = (ctx: HttpContext): Task => {
  const postIdRaw = parsePostIdRequired(ctx);
  if (postIdRaw === undefined) {
    return writeJson(ctx.response, 400, serializeError("Missing post id"));
  }
  const postId = unwrapInt(postIdRaw);

  let payload = "";
  const db = new BlogDbContext(DB_OPTIONS);
  try {
    const query = Queryable.orderBy(db.comments.asQueryable(), (c: CommentEntity) => c.CreatedAt);
    const filtered = Queryable.where(query, (c: CommentEntity) => c.PostId === postId);
    const list = Enumerable.toList(filtered).toArray();
    const dtos = new List<CommentDto>();
    for (let i = 0; i < list.length; i++) {
      dtos.add(toCommentDto(list[i]));
    }
    payload = JsonSerializer.serialize<List<CommentDto>>(dtos);
  } finally {
    db.dispose();
  }

  return writeJson(ctx.response, 200, payload);
};

export const handleCreateComment = (ctx: HttpContext): Task => {
  const postIdRaw = parsePostIdRequired(ctx);
  if (postIdRaw === undefined) {
    return writeJson(ctx.response, 400, serializeError("Missing post id"));
  }
  const postId = unwrapInt(postIdRaw);

  return TaskExtensions.unwrap(
    readRequestBodyAsync(ctx).continueWith<Task>((t: Task<string>, _state) => {
      const input = JsonSerializer.deserialize<CommentCreateInput>(t.result);
      if (input === undefined || typeof input.author !== "string" || typeof input.body !== "string") {
        return writeJson(
          ctx.response,
          400,
          serializeError("Invalid JSON: expected {\"author\": \"...\", \"body\": \"...\"}")
        );
      }
      if (input.body.trim() === "") {
        return writeJson(ctx.response, 400, serializeError("Comment body is required"));
      }

      let payload: string | undefined = undefined;
      const db = new BlogDbContext(DB_OPTIONS);
      try {
        const post = db.posts.find(postId);
        if (post !== undefined) {
          const comment: CommentEntity = {
            Id: 0,
            PostId: postId,
            Author: input.author.trim() === "" ? "Anonymous" : input.author,
            Body: input.body,
            CreatedAt: DateTime.utcNow,
          };
          db.comments.add(comment);
          db.saveChanges();
          payload = JsonSerializer.serialize<CommentDto>(toCommentDto(comment));
        }
      } finally {
        db.dispose();
      }

      if (payload === undefined) {
        return writeJson(ctx.response, 404, serializeError("Post not found"));
      }

      return writeJson(ctx.response, 201, payload);
    }, undefined)
  );
};
