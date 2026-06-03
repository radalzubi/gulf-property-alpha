/**
 * Portable ingestion worker.
 *
 * Run standalone with `npm run worker`. On serverless hosts (Vercel/Supabase)
 * use Vercel Cron or Supabase pg_cron to hit POST /api/ingestion/run instead.
 *
 * A 1-minute tick checks each adapter's refresh frequency and runs the ones that
 * are due, respecting per-source locks. Disabled unless ENABLE_SCHEDULER=true.
 * Free-tier note: intervals below are honored as-is; relax them on constrained
 * hosts to respect rate/invocation limits.
 */
import { loadEnv } from "../lib/loadEnv";
loadEnv();
import cron from "node-cron";
import { ADAPTERS } from "./adapters";
import { runAdapter } from "./core/runner";

const lastRun = new Map<string, number>();

async function tick() {
  const nowMs = Date.now();
  for (const a of ADAPTERS) {
    const freq = a.refreshFrequencyMinutes;
    if (freq == null) continue; // on-demand only
    const due = (nowMs - (lastRun.get(a.id) ?? 0)) / 60000 >= freq;
    if (!due) continue;
    lastRun.set(a.id, nowMs);
    const res = await runAdapter(a);
    // eslint-disable-next-line no-console
    console.log(`[scheduler] ${a.id}: ${res.status} — ${res.message}`);
  }
}

function main() {
  if (process.env.ENABLE_SCHEDULER !== "true") {
    // eslint-disable-next-line no-console
    console.log("[scheduler] ENABLE_SCHEDULER!=true — not starting. Set ENABLE_SCHEDULER=true to run.");
    return;
  }
  // eslint-disable-next-line no-console
  console.log(`[scheduler] starting; ${ADAPTERS.length} adapters registered. Tick every minute.`);
  cron.schedule("* * * * *", () => {
    tick().catch((e) => console.error("[scheduler] tick error", e));
  });
  // run once immediately
  tick().catch((e) => console.error("[scheduler] initial tick error", e));
}

main();
