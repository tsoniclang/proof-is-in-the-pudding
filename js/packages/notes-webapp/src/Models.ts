export interface Note {
  id: number;
  title: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

export interface NoteCreateInput {
  title: string;
  content: string;
}

export interface NoteUpdateInput {
  title: string;
  content: string;
}

export interface ErrorResponse {
  error: string;
}
