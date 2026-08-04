import { Environment } from "@tsonic/dotnet/System.js";

import {
  DbContextOptionsBuilder,
  SqliteDbContextOptionsBuilderExtensions,
  type DbContextOptions,
} from "@tsonic/dotnet/Microsoft.EntityFrameworkCore.js";

export const DB_PATH = Environment.GetEnvironmentVariable("TS_PUDDING_DB") ?? "app.db";

export const createDbOptions = (dbPath: string): DbContextOptions => {
  const optionsBuilder = new DbContextOptionsBuilder();
  const connectionString = `Data Source=${dbPath}`;
  SqliteDbContextOptionsBuilderExtensions.UseSqlite(optionsBuilder, connectionString);
  return optionsBuilder.Options;
};

export const DB_OPTIONS = createDbOptions(DB_PATH);
