import { JsonSerializer } from "@tsonic/dotnet/System.Text.Json.js";
import type { Note, NoteCreateInput, NoteUpdateInput } from "./Models.js";

export const serializeNote = (note: Note): string => JSON.stringify(note);

export const serializeNotes = (notes: Note[]): string => JSON.stringify(notes);

export const parseNoteCreate = (json: string): NoteCreateInput | undefined => {
  try {
    return JsonSerializer.Deserialize<NoteCreateInput>(json);
  } catch {
    return undefined;
  }
};

export const parseNoteUpdate = (json: string): NoteUpdateInput | undefined => {
  try {
    return JsonSerializer.Deserialize<NoteUpdateInput>(json);
  } catch {
    return undefined;
  }
};

export const serializeError = (message: string): string =>
  JSON.stringify({ error: message });
