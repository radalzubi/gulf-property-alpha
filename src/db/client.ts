import postgres from "postgres";
import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import * as schema from "./schema";

let _client: ReturnType<typeof postgres> | null = null;
let _db: PostgresJsDatabase<typeof schema> | null = null;

/** Lazily-created pooled Postgres connection + Drizzle instance. */
export function getDb(): PostgresJsDatabase<typeof schema> {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");
  if (!_db) {
    _client = postgres(url, { max: 5, prepare: false });
    _db = drizzle(_client, { schema });
  }
  return _db;
}

export async function closeDb() {
  await _client?.end();
  _client = null;
  _db = null;
}

export { schema };
