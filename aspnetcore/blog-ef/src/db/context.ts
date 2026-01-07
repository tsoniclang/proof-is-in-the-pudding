import { DbContext, DbContextOptions, DbSet } from "@tsonic/efcore/Microsoft.EntityFrameworkCore.js";

import type { CommentEntity, PostEntity } from "./entities.ts";

export class BlogDbContext extends DbContext {
  get posts(): DbSet<PostEntity> {
    return this.set_<PostEntity>();
  }

  get comments(): DbSet<CommentEntity> {
    return this.set_<CommentEntity>();
  }

  constructor(options: DbContextOptions) {
    super(options);
  }
}

