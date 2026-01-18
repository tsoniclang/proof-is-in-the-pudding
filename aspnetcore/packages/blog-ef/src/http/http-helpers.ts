import { int } from "@tsonic/core/types.js";
import { Int32 } from "@tsonic/dotnet/System.js";
import { StreamReader } from "@tsonic/dotnet/System.IO.js";
import { Encoding } from "@tsonic/dotnet/System.Text.js";
import { JsonSerializer } from "@tsonic/dotnet/System.Text.Json.js";
import { Task } from "@tsonic/dotnet/System.Threading.Tasks.js";

import { HttpContext, HttpResponse, HttpResponseWritingExtensions } from "@tsonic/aspnetcore/Microsoft.AspNetCore.Http.js";

import type { ErrorResponse } from "../db/dtos.ts";

export const serializeError = (message: string): string =>
  JsonSerializer.Serialize<ErrorResponse>({ error: message });

export const readRequestBodyAsync = (ctx: HttpContext): Task<string> => {
  const reader = new StreamReader(ctx.Request.Body, Encoding.UTF8);
  return reader.ReadToEndAsync().ContinueWith<string>((t, _state) => {
    reader.Close();
    return t.Result;
  }, undefined);
};

export const writeText = (response: HttpResponse, statusCode: int, contentType: string, body: string): Task => {
  response.StatusCode = statusCode;
  response.ContentType = contentType;
  // HTTP 204 (No Content) and 304 (Not Modified) must not include a response body.
  // Kestrel throws if we attempt to write a body for these status codes.
  if (statusCode === 204 || statusCode === 304 || (statusCode >= 100 && statusCode < 200)) {
    return Task.CompletedTask;
  }
  return HttpResponseWritingExtensions.WriteAsync(response, body);
};

export const writeJson = (response: HttpResponse, statusCode: int, body: string): Task =>
  writeText(response, statusCode, "application/json", body);

export const getPath = (ctx: HttpContext): string => ctx.Request.Path.Value;

export const parsePostIdFromPath = (path: string): int | undefined => {
  const parts = path.Split("/");
  if (parts.Length < 4) return undefined;
  const idStr = parts[3];
  if (idStr === "") return undefined;
  return Int32.Parse(idStr);
};

export const parsePostIdRequired = (ctx: HttpContext): int | undefined =>
  parsePostIdFromPath(getPath(ctx));

export const unwrapInt = (value: int): int => value;
