import Papa from "papaparse";
import { type Adapter, type IngestionResult, now, result } from "../core/adapter";
import { mapDldRow, upsertTransactions, type MappedTxn } from "../dld/mapTransaction";

/**
 * Dubai Land Department open data via Dubai Pulse.
 *
 * With `DLD_OPENDATA_TRANSACTIONS_URL` configured this adapter performs a REAL
 * fetch, normalizes rows (shared mapper) and upserts into `government_transactions`
 * when a Postgres DB is configured. With no URL it returns `not_configured` and
 * the dashboard keeps serving labeled SAMPLE data.
 *
 * Note: the Dubai Pulse human portal is often geo-restricted (UAE-only). The
 * automatic pipeline therefore also supports a globally-reachable Kaggle mirror
 * via a scheduled GitHub Action (see src/ingestion/kaggle/ingestDld.ts), which
 * reuses the same mapper + upsert.
 *
 * Compliance: open government data only. No portal scraping. 8s timeout, row cap.
 */
export const dubaiPulseAdapter: Adapter = {
  id: "dld_open_data",
  name: "Dubai Land Department — Open Data (Dubai Pulse)",
  sourceType: "official",
  sourceClass: "government_verified",
  isOfficial: true,
  refreshFrequencyMinutes: 1440,

  validateCredentials() {
    const url = process.env.DLD_OPENDATA_TRANSACTIONS_URL;
    if (!url) {
      return {
        configured: false,
        instructions:
          "Set DLD_OPENDATA_TRANSACTIONS_URL to a DLD/Dubai Pulse open-data CSV endpoint (Transactions dataset) or a local mirror. The portal is often UAE-geo-restricted — the scheduled GitHub Action (Kaggle mirror) is the recommended automatic path.",
      };
    }
    return { configured: true };
  },

  async run(): Promise<IngestionResult> {
    const startedAt = now();
    const cfg = this.validateCredentials();
    if (!cfg.configured) return result("dld_open_data", "not_configured", cfg.instructions!, startedAt);

    const url = process.env.DLD_OPENDATA_TRANSACTIONS_URL!;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    try {
      const res = await fetch(url, { signal: controller.signal, headers: { accept: "text/csv,application/json" } });
      if (!res.ok) return result("dld_open_data", "failing", `Fetch returned HTTP ${res.status}.`, startedAt, {}, `HTTP ${res.status}`);

      const text = await res.text();
      const capped = text.split("\n").slice(0, 20000).join("\n");
      const parsed = Papa.parse<Record<string, unknown>>(capped, { header: true, skipEmptyLines: true });
      const raw = parsed.data.filter((r) => Object.keys(r).length > 1);

      const mapped: MappedTxn[] = [];
      let rejected = 0;
      for (const r of raw) {
        const m = mapDldRow(r);
        if (m) mapped.push(m);
        else rejected++;
      }

      const inserted = await upsertTransactions(mapped);
      const persistedNote = process.env.DATABASE_URL
        ? `upserted ${inserted} into government_transactions (idempotent).`
        : "DATABASE_URL not set — parsed only. Set DATABASE_URL + DATA_BACKEND=postgres to persist.";

      return result(
        "dld_open_data",
        rejected > raw.length * 0.5 ? "degraded" : "ok",
        `Fetched ${raw.length} rows, normalized ${mapped.length}; ${persistedNote}`,
        startedAt,
        { recordsSeen: raw.length, recordsInserted: inserted, recordsRejected: rejected },
      );
    } catch (err) {
      const msg = (err as Error).name === "AbortError" ? "Request timed out after 8s." : (err as Error).message;
      return result("dld_open_data", "failing", `Live fetch failed — continuing on SAMPLE data. ${msg}`, startedAt, {}, msg);
    } finally {
      clearTimeout(timeout);
    }
  },
};
