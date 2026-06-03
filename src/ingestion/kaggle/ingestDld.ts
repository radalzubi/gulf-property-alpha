/**
 * Ingests a Dubai Land Department transactions CSV (downloaded from the open
 * Kaggle mirror) into Postgres. Run by the scheduled GitHub Action — the
 * automatic, globally-reachable path that works even when the Dubai Pulse
 * portal is geo-blocked.
 *
 * Usage:  tsx src/ingestion/kaggle/ingestDld.ts <csv-file-or-dir>   (default ./data)
 * Env:    DATABASE_URL (required), INGEST_MAX_ROWS (optional cap, 0 = all)
 */
import { loadEnv } from "../../lib/loadEnv";
loadEnv();
import fs from "node:fs";
import path from "node:path";
import Papa from "papaparse";
import { mapDldRow, upsertTransactions, type MappedTxn } from "../dld/mapTransaction";
import { closeDb } from "../../db/client";

/** Accept a CSV file path, or a directory (pick the largest .csv inside). */
function resolveCsv(input: string): string {
  const stat = fs.statSync(input);
  if (stat.isFile()) return input;
  const csvs = fs
    .readdirSync(input)
    .filter((f) => f.toLowerCase().endsWith(".csv"))
    .map((f) => ({ f, size: fs.statSync(path.join(input, f)).size }))
    .sort((a, b) => b.size - a.size);
  if (csvs.length === 0) throw new Error(`No .csv found in ${input}`);
  return path.join(input, csvs[0].f);
}

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL is not set — configure it (or the GitHub Action secret) to ingest.");
    process.exit(1);
  }
  const input = process.argv[2] ?? "./data";
  const csvPath = resolveCsv(input);
  console.log(`Reading ${csvPath} …`);

  const text = fs.readFileSync(csvPath, "utf8");
  const parsed = Papa.parse<Record<string, unknown>>(text, { header: true, skipEmptyLines: true });
  const rows = parsed.data;
  const cap = Number(process.env.INGEST_MAX_ROWS ?? 0);

  const mapped: MappedTxn[] = [];
  let rejected = 0;
  for (const r of rows) {
    if (cap && mapped.length >= cap) break;
    const m = mapDldRow(r);
    if (m) mapped.push(m);
    else rejected++;
  }

  console.log(`Parsed ${rows.length} rows · normalized ${mapped.length} · rejected ${rejected}. Upserting…`);
  const inserted = await upsertTransactions(mapped);
  console.log(`✓ DLD ingest complete: ${inserted} new transactions upserted into government_transactions (idempotent).`);
  await closeDb();
}

main().catch(async (e) => {
  console.error("DLD ingest failed:", e);
  await closeDb().catch(() => {});
  process.exit(1);
});
