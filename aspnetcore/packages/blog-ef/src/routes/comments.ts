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
    return writeJson(ctx.Response, 400, serializeError("Missing post id"));
  }
  const postId = unwrapInt(postIdRaw);

  let payload = "";
  const db = new BlogDbContext(DB_OPTIONS);
  try {
    const query = Queryable.OrderByDescending<CommentEntity, DateTime>(
      db.comments.AsQueryable(),
      (c: CommentEntity): DateTime => c.CreatedAt
    );
    const filtered = Queryable.Where(query, (c: CommentEntity) => c.PostId === postId);
    const list = Enumerable.ToList(filtered).ToArray();
    const dtos = new List<CommentDto>();
    for (let i = 0; i < list.Length; i++) {
      dtos.Add(toCommentDto(list[i]));
    }
    payload = JsonSerializer.Serialize<List<CommentDto>>(dtos);
  } finally {
    db.Dispose();
  }

  return writeJson(ctx.Response, 200, payload);
};

export const handleCreateComment = (ctx: HttpContext): Task => {
  const postIdRaw = parsePostIdRequired(ctx);
  if (postIdRaw === undefined) {
    return writeJson(ctx.Response, 400, serializeError("Missing post id"));
  }
  const postId = unwrapInt(postIdRaw);

  return TaskExtensions.Unwrap(
    readRequestBodyAsync(ctx).ContinueWith<Task>((t: Task<string>, _state) => {
      const input = JsonSerializer.Deserialize<CommentCreateInput>(t.Result);
      if (input === undefined || typeof input.author !== "string" || typeof input.body !== "string") {
        return writeJson(
          ctx.Response,
          400,
          serializeError("Invalid JSON: expected {\"author\": \"...\", \"body\": \"...\"}")
        );
      }
      if (input.body.Trim() === "") {
        return writeJson(ctx.Response, 400, serializeError("Comment body is required"));
      }

      let payload: string | undefined = undefined;
      const db = new BlogDbContext(DB_OPTIONS);
      try {
        const post = db.posts.Find(postId);
        if (post !== undefined) {
          const comment: CommentEntity = {
            Id: 0,
            PostId: postId,
            Author: input.author.Trim() === "" ? "Anonymous" : input.author,
            Body: input.body,
            CreatedAt: DateTime.UtcNow,
          };
          db.comments.Add(comment);
          db.SaveChanges();
          payload = JsonSerializer.Serialize<CommentDto>(toCommentDto(comment));
        }
      } finally {
        db.Dispose();
      }

      if (payload === undefined) {
        return writeJson(ctx.Response, 404, serializeError("Post not found"));
      }

      return writeJson(ctx.Response, 201, payload);
    }, undefined)
  );
};
