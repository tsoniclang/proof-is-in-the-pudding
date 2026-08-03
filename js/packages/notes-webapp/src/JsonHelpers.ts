import type { Note, NoteCreateInput, NoteUpdateInput } from "./Models.js";

export const serializeNote = (note: Note): string => JSON.stringify(note);

export const serializeNotes = (notes: Note[]): string => JSON.stringify(notes);

export const parseNoteCreate = (json: string): NoteCreateInput | undefined => {
  try {
    const obj = JSON.parse(json) as { title?: unknown; content?: unknown };
    if (typeof obj.title !== "string" || typeof obj.content !== "string") {
      return undefined;
    }
    return { title: obj.title, content: obj.content };
  } catch {
    return undefined;
  }
};

export const parseNoteUpdate = (json: string): NoteUpdateInput | undefined => {
  try {
    const obj = JSON.parse(json) as { title?: unknown; content?: unknown };
    if (typeof obj.title !== "string" || typeof obj.content !== "string") {
      return undefined;
    }
    return { title: obj.title, content: obj.content };
  } catch {
    return undefined;
  }
};

export const serializeError = (message: string): string =>
  JSON.stringify({ error: message });
