import { List } from "@tsonic/dotnet/System.Collections.Generic.js";
import { DateTime } from "@tsonic/dotnet/System.js";
import { int } from "@tsonic/core/types.js";
import type { Note, NoteCreateInput, NoteUpdateInput } from "./Models.ts";

const notes = new List<Note>();
let nextId: int = 1;

const nowIso = (): string => DateTime.UtcNow.ToString("O");

export function list(): Note[] {
  return notes.ToArray();
}

export function getById(id: int): Note | undefined {
  return notes.Find((n) => n.id === id);
}

export function create(input: NoteCreateInput): Note {
  const id = nextId;
  nextId = id + 1;

  const now = nowIso();
  const note: Note = {
    id,
    title: input.title,
    content: input.content,
    createdAt: now,
    updatedAt: now,
  };

  notes.Add(note);
  return note;
}

export function update(id: int, input: NoteUpdateInput): Note | undefined {
  const index = notes.FindIndex((n) => n.id === id);
  if (index === -1) return undefined;

  const existing = notes.Find((n) => n.id === id);
  if (existing === undefined) return undefined;
  const note: Note = {
    id,
    title: input.title,
    content: input.content,
    createdAt: existing.createdAt,
    updatedAt: nowIso(),
  };

  notes.RemoveAt(index);
  notes.Insert(index, note);
  return note;
}

export function remove(id: int): boolean {
  const index = notes.FindIndex((n) => n.id === id);
  if (index === -1) return false;
  notes.RemoveAt(index);
  return true;
}

export function seed(): void {
  if (notes.Count > 0) return;

  create({
    title: "Welcome to Tsonic Notes",
    content:
      "This is a tiny full-stack webapp: HTML UI + JSON API, compiled TS -> C# -> NativeAOT.",
  });

  create({
    title: "Try it",
    content:
      "Open http://localhost:8080 and create/update/delete notes in your browser.",
  });
}
