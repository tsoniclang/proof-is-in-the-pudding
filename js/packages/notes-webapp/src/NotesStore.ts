import type { Note, NoteCreateInput, NoteUpdateInput } from "./Models.ts";

const notes: Note[] = [];
let nextId = 1;

const nowIso = (): string => new Date().toISOString();

export function list(): Note[] {
  return notes.slice();
}

export function getById(id: number): Note | undefined {
  return notes.find((n) => n.id === id);
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

  notes.push(note);
  return note;
}

export function update(id: number, input: NoteUpdateInput): Note | undefined {
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

  notes.splice(index, 1, note);
  return note;
}

export function remove(id: number): boolean {
  const index = notes.findIndex((n) => n.id === id);
  if (index === -1) return false;
  notes.splice(index, 1);
  return true;
}

export function seed(): void {
  if (notes.length > 0) return;

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
