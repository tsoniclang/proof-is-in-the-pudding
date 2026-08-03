import { JsonDocument, JsonException, JsonValueKind } from "@tsonic/dotnet/System.Text.Json.js";

import type { CommentCreateInput, PostInput } from "../db/dtos.js";

function tryParseJsonDocument(json: string): JsonDocument | undefined {
  try {
    return JsonDocument.Parse(json);
  } catch (error) {
    if (!(error instanceof JsonException)) throw error;
    return undefined;
  }
}

export function parsePostInput(json: string): PostInput | undefined {
  const document = tryParseJsonDocument(json);
  if (document === undefined) return undefined;
  try {
    const root = document.RootElement;
    if (root.ValueKind !== JsonValueKind.Object) return undefined;
    let title: string | undefined = undefined;
    let content: string | undefined = undefined;
    const properties = root.EnumerateObject().GetEnumerator();
    while (properties.MoveNext()) {
      const property = properties.Current;
      if (property.Name === "title" && property.Value.ValueKind === JsonValueKind.String) {
        title = property.Value.GetString();
      } else if (property.Name === "content" && property.Value.ValueKind === JsonValueKind.String) {
        content = property.Value.GetString();
      }
    }
    if (title === undefined || content === undefined) return undefined;
    return { title, content };
  } finally {
    document.Dispose();
  }
}

export function parseCommentCreate(json: string): CommentCreateInput | undefined {
  const document = tryParseJsonDocument(json);
  if (document === undefined) return undefined;
  try {
    const root = document.RootElement;
    if (root.ValueKind !== JsonValueKind.Object) return undefined;
    let author: string | undefined = undefined;
    let body: string | undefined = undefined;
    const properties = root.EnumerateObject().GetEnumerator();
    while (properties.MoveNext()) {
      const property = properties.Current;
      if (property.Name === "author" && property.Value.ValueKind === JsonValueKind.String) {
        author = property.Value.GetString();
      } else if (property.Name === "body" && property.Value.ValueKind === JsonValueKind.String) {
        body = property.Value.GetString();
      }
    }
    if (author === undefined || body === undefined) return undefined;
    return { author, body };
  } finally {
    document.Dispose();
  }
}
