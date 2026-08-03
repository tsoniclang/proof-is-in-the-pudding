import { DateTime } from "@tsonic/dotnet/System.js";
import { Queryable } from "@tsonic/dotnet/System.Linq.js";

import { BlogDbContext } from "./context.js";
import { PostEntity } from "./entities.js";
import { DB_OPTIONS } from "./options.js";

export const ensureCreatedAndSeed = (): void => {
  const db = new BlogDbContext(DB_OPTIONS);
  try {
    db.Database.EnsureCreated();

    if (!Queryable.Any(db.posts.AsQueryable())) {
      const now = DateTime.UtcNow;
      const post = new PostEntity();
      post.Title = "Welcome to Tsonic";
      post.Content = "This blog is backed by EF Core + SQLite.";
      post.CreatedAt = now;
      post.UpdatedAt = now;
      db.posts.Add(post);
      db.SaveChanges();
    }
  } finally {
    db.Dispose();
  }
};
