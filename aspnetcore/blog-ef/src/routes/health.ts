import { JsonSerializer } from "@tsonic/dotnet/System.Text.Json.js";
import { Task } from "@tsonic/dotnet/System.Threading.Tasks.js";

import { HttpContext } from "@tsonic/aspnetcore/Microsoft.AspNetCore.Http.js";

import type { HealthResponse } from "../db/dtos.ts";
import { writeJson } from "../http/http-helpers.ts";

export const handleHealth = (ctx: HttpContext): Task => {
  const payload = JsonSerializer.serialize<HealthResponse>({ ok: true });
  return writeJson(ctx.response, 200, payload);
};

