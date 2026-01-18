import { JsonSerializer } from "@tsonic/dotnet/System.Text.Json.js";
import { Task } from "@tsonic/dotnet/System.Threading.Tasks.js";

import { HttpContext } from "@tsonic/aspnetcore/Microsoft.AspNetCore.Http.js";

import type { HealthResponse } from "../db/dtos.ts";
import { writeJson } from "../http/http-helpers.ts";

export const handleHealth = (ctx: HttpContext): Task => {
  const payload = JsonSerializer.Serialize<HealthResponse>({ ok: true });
  return writeJson(ctx.Response, 200, payload);
};
