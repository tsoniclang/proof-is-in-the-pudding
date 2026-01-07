import { List } from "@tsonic/dotnet/System.Collections.Generic.js";
import { DateTime } from "@tsonic/dotnet/System.js";
import { long } from "@tsonic/core/types.js";
import type { Note, NoteCreateInput, NoteUpdateInput } from "./Models.ts";

const notes = new List<Note>();
let nextId: long = 1 as long;

const nowIso = (): string => DateTime.utcNow.toString("O");

export function list(): Note[] {
  return notes.toArray();
}

export function getById(id: long): Note | undefined {
  return notes.find((n) => n.id === id);
}

export function create(input: NoteCreateInput): Note {
  const id = nextId;
  nextId = (id + 1) as long;

  const now = nowIso();
  const note: Note = {
    id,
    title: input.title,
    content: input.content,
    createdAt: now,
    updatedAt: now,
  };

  notes.add(note);
  return note;
}

export function update(id: long, input: NoteUpdateInput): Note | undefined {
  const index = notes.findIndex((n) => n.id === id);
  if (index === -1) return undefined;

  const existing = notes.find((n) => n.id === id);
  if (existing === undefined) return undefined;
  const note: Note = {
    id,
    title: input.title,
    content: input.content,
    createdAt: existing.createdAt,
    updatedAt: nowIso(),
  };

  notes.removeAt(index);
  notes.insert(index, note);
  return note;
}

export function remove(id: long): boolean {
  const index = notes.findIndex((n) => n.id === id);
  if (index === -1) return false;
  notes.removeAt(index);
  return true;
}

export function seed(): void {
  if (notes.count > 0) return;

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
