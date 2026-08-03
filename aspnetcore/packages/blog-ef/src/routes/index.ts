import { Task } from "@tsonic/dotnet/System.Threading.Tasks.js";

import { HttpContext } from "@tsonic/dotnet/Microsoft.AspNetCore.Http.js";

import { writeText } from "../http/http-helpers.js";
import { INDEX_HTML } from "../ui/index-html.js";

export const handleIndex = (ctx: HttpContext): Task =>
  writeText(ctx.Response, 200, "text/html; charset=utf-8", INDEX_HTML);
