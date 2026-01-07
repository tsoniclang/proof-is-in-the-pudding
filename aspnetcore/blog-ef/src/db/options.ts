import { Environment } from "@tsonic/dotnet/System.js";

import { DbContextOptions, DbContextOptionsBuilder } from "@tsonic/efcore/Microsoft.EntityFrameworkCore.js";
import "@tsonic/efcore/Microsoft.EntityFrameworkCore.Infrastructure.js";
import { SqliteDbContextOptionsBuilderExtensions } from "@tsonic/efcore-sqlite/Microsoft.EntityFrameworkCore.js";

export const DB_PATH = Environment.getEnvironmentVariable("TS_PUDDING_DB") ?? "app.db";

export const createDbOptions = (dbPath: string): DbContextOptions => {
  const optionsBuilder = new DbContextOptionsBuilder();
  const connectionString = `Data Source=${dbPath}`;
  SqliteDbContextOptionsBuilderExtensions.useSqlite(optionsBuilder, connectionString);
  return optionsBuilder.options;
};

export const DB_OPTIONS = createDbOptions(DB_PATH);

