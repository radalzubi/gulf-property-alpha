import { loadEnv } from "../lib/loadEnv";
loadEnv();
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";

/** Ensures PostGIS exists, then applies generated Drizzle migrations. */
async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("DATABASE_URL is not set. Configure it in .env to migrate.");
    process.exit(1);
  }
  const sql = postgres(url, { max: 1 });
  try {
    await sql`create extension if not exists postgis`;
    const db = drizzle(sql);
    await migrate(db, { migrationsFolder: "src/db/migrations" });
    console.log("✓ Migrations applied (PostGIS ensured).");
  } finally {
    await sql.end();
  }
}

main().catch((e) => {
  console.error("Migration failed:", e);
  process.exit(1);
});
