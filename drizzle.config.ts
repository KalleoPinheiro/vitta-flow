import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./src/infrastructure/persistence/drizzle/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL ?? "postgres://vitta:vitta@localhost:5432/vitta",
  },
});
