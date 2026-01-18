import { JSON } from "@tsonic/js/index.js";
import type { Note, NoteCreateInput, NoteUpdateInput } from "./Models.ts";

export const serializeNote = (note: Note): string => JSON.stringify(note);

export const serializeNotes = (notes: Note[]): string => JSON.stringify(notes);

export const parseNoteCreate = (json: string): NoteCreateInput | undefined => {
  const obj = JSON.parse<NoteCreateInput>(json);
  if (typeof obj.title !== "string" || typeof obj.content !== "string") {
    return undefined;
  }
  return { title: obj.title, content: obj.content };
};

export const parseNoteUpdate = (json: string): NoteUpdateInput | undefined => {
  const obj = JSON.parse<NoteUpdateInput>(json);
  if (typeof obj.title !== "string" || typeof obj.content !== "string") {
    return undefined;
  }
  return { title: obj.title, content: obj.content };
};

export const serializeError = (message: string): string =>
  JSON.stringify({ error: message });
