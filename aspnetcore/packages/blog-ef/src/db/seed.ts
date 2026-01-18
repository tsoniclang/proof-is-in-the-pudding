import { DateTime } from "@tsonic/dotnet/System.js";
import { Queryable } from "@tsonic/dotnet/System.Linq.js";

import { BlogDbContext } from "./context.ts";
import type { PostEntity } from "./entities.ts";
import { DB_OPTIONS } from "./options.ts";

export const ensureCreatedAndSeed = (): void => {
  const db = new BlogDbContext(DB_OPTIONS);
  try {
    db.Database.EnsureCreated();

    if (!Queryable.Any(db.posts.AsQueryable())) {
      const now = DateTime.UtcNow;
      const post: PostEntity = {
        Id: 0,
        Title: "Welcome to Tsonic",
        Content: "This blog is backed by EF Core + SQLite.",
        CreatedAt: now,
        UpdatedAt: now,
      };
      db.posts.Add(post);
      db.SaveChanges();
    }
  } finally {
    db.Dispose();
  }
};
