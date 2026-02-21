import "server-only";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import * as schema from "./schema";

const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL;
if (!connectionString) {
  throw new Error("Missing DATABASE_URL/POSTGRES_URL");
}

const client = postgres(connectionString, {
  ssl: "require",
});

export const db = drizzle(client, { schema });
