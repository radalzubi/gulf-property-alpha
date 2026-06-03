import type { Repository } from "./types";
import { memoryRepository } from "./memory";

export * from "./types";
export { memoryRepository };

let cached: Repository | null = null;

/**
 * Selects the data backend:
 *   DATA_BACKEND=memory   → always sample (default, zero-config)
 *   DATA_BACKEND=postgres → Postgres/Drizzle (requires DATABASE_URL)
 *   DATA_BACKEND=auto     → postgres if DATABASE_URL is set, else memory
 *
 * The Postgres repository is loaded lazily so the app never fails to boot when
 * the DB / driver is absent — it falls back to the in-memory sample repository.
 */
export async function getRepository(): Promise<Repository> {
  if (cached) return cached;
  const mode = (process.env.DATA_BACKEND ?? "auto").toLowerCase();
  const hasDb = !!process.env.DATABASE_URL;
  const wantPostgres = mode === "postgres" || (mode === "auto" && hasDb);

  if (wantPostgres && hasDb) {
    try {
      const mod = await import("./postgres");
      cached = await mod.createPostgresRepository();
      return cached;
    } catch (err) {
      // Never crash the dashboard — degrade to sample with a clear server log.
      console.warn("[repo] Postgres backend unavailable, falling back to in-memory SAMPLE data:", (err as Error).message);
    }
  }
  cached = memoryRepository;
  return cached;
}
