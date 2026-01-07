import { int } from "@tsonic/core/types.js";
import { Int32 } from "@tsonic/dotnet/System.js";
import { StreamReader } from "@tsonic/dotnet/System.IO.js";
import { Encoding } from "@tsonic/dotnet/System.Text.js";
import { JsonSerializer } from "@tsonic/dotnet/System.Text.Json.js";
import { Task } from "@tsonic/dotnet/System.Threading.Tasks.js";

import { HttpContext, HttpResponse, HttpResponseWritingExtensions } from "@tsonic/aspnetcore/Microsoft.AspNetCore.Http.js";

import type { ErrorResponse } from "../db/dtos.ts";

export const serializeError = (message: string): string =>
  JsonSerializer.serialize<ErrorResponse>({ error: message });

export const readRequestBodyAsync = (ctx: HttpContext): Task<string> => {
  const reader = new StreamReader(ctx.request.body, Encoding.UTF8);
  return reader.readToEndAsync().continueWith<string>((t, _state) => {
    reader.close();
    return t.result;
  }, undefined);
};

export const writeText = (response: HttpResponse, statusCode: int, contentType: string, body: string): Task => {
  response.statusCode = statusCode;
  response.contentType = contentType;
  return HttpResponseWritingExtensions.writeAsync(response, body);
};

export const writeJson = (response: HttpResponse, statusCode: int, body: string): Task =>
  writeText(response, statusCode, "application/json", body);

export const getPath = (ctx: HttpContext): string => ctx.request.path.value;

export const parsePostIdFromPath = (path: string): int | undefined => {
  const parts = path.split("/");
  if (parts.length < 4) return undefined;
  const idStr = parts[3];
  if (idStr === "") return undefined;
  return Int32.parse(idStr);
};

export const parsePostIdRequired = (ctx: HttpContext): int | undefined =>
  parsePostIdFromPath(getPath(ctx));

export const unwrapInt = (value: int): int => value;
