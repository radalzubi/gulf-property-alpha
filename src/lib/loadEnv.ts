import { existsSync } from "node:fs";
import { resolve } from "node:path";

/**
 * Loads `.env` then `.env.local` (local overrides) into process.env for
 * standalone CLI scripts run via tsx (db:seed, db:migrate, worker).
 *
 * Next.js loads these files automatically; plain Node/tsx does not — so these
 * scripts call loadEnv() before reading process.env.DATABASE_URL.
 */
export function loadEnv(): void {
  const loader = (process as unknown as { loadEnvFile?: (p: string) => void }).loadEnvFile;
  for (const file of [".env", ".env.local"]) {
    const p = resolve(process.cwd(), file);
    if (existsSync(p) && typeof loader === "function") {
      try {
        loader(p);
      } catch {
        /* ignore malformed env files */
      }
    }
  }
}
