import type { Adapter, IngestionResult } from "./adapter";

/**
 * In-process job log + simple per-source lock. In production these live in the
 * `ingestion_jobs` table and use a Postgres advisory lock; in the default
 * memory backend we keep a bounded in-memory ring so the UI has data to show.
 */
const jobs: IngestionResult[] = [];
const locks = new Set<string>();
const MAX_JOBS = 200;

export function getJobs(): IngestionResult[] {
  return jobs;
}

/** Runs an adapter with a per-source lock; logs the job. Never throws. */
export async function runAdapter(adapter: Adapter): Promise<IngestionResult> {
  if (locks.has(adapter.id)) {
    const r: IngestionResult = {
      sourceId: adapter.id,
      status: "degraded",
      message: "A run for this source is already in progress (source lock held).",
      recordsSeen: 0,
      recordsInserted: 0,
      recordsUpdated: 0,
      recordsRejected: 0,
      startedAt: new Date().toISOString(),
      finishedAt: new Date().toISOString(),
    };
    jobs.unshift(r);
    return r;
  }
  locks.add(adapter.id);
  try {
    const res = await adapter.run();
    jobs.unshift(res);
    if (jobs.length > MAX_JOBS) jobs.length = MAX_JOBS;
    return res;
  } catch (err) {
    const r: IngestionResult = {
      sourceId: adapter.id,
      status: "failing",
      message: "Adapter threw unexpectedly (caught by runner).",
      recordsSeen: 0,
      recordsInserted: 0,
      recordsUpdated: 0,
      recordsRejected: 0,
      startedAt: new Date().toISOString(),
      finishedAt: new Date().toISOString(),
      error: (err as Error).message,
    };
    jobs.unshift(r);
    return r;
  } finally {
    locks.delete(adapter.id);
  }
}
