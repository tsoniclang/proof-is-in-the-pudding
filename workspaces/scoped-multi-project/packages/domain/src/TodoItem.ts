export class TodoItem {
  readonly id: string;
  title: string;
  completed: boolean;

  constructor(id: string, title: string) {
    this.id = id;
    this.title = title;
    this.completed = false;
  }

  toggle(): void {
    this.completed = !this.completed;
  }

  toString(): string {
    const status = this.completed ? "done" : "todo";
    return `${this.id}: ${this.title} (${status})`;
  }
}

