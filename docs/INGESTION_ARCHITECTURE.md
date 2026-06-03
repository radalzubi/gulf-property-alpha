# Ingestion Architecture

## Flow

```
Adapter.run()  →  fetch raw  →  (archive raw_records)  →  normalize  →  idempotent upsert
              →  dedup  →  score  →  recommend        →  log ingestion_jobs + update source health
```

In the default **memory backend**, ingestion is demonstrated end-to-end (adapters, runner, job log, source lock) without mutating the static SAMPLE dataset. In the **Postgres backend**, normalized rows upsert on `(source_id, external_id)`; `last_seen` drives stale detection; `raw_records` keeps a hash-deduped archive.

## Adapter interface (`src/ingestion/core/adapter.ts`)

Each connector declares `id`, `name`, `sourceType`, `sourceClass`, `isOfficial`, `refreshFrequencyMinutes`, and implements:

- `validateCredentials()` → `{configured, instructions?}` — **never throws**; returns setup steps when unconfigured.
- `run()` → `IngestionResult` `{status, message, recordsSeen/Inserted/Updated/Rejected, startedAt, finishedAt, error?}`.

Statuses: `ok | degraded | failing | not_configured`. The runner (`core/runner.ts`) wraps each run with a **per-source lock**, catches all errors, and appends to an in-memory job log (`GET /api/ingestion/jobs`).

## Connectors

Registry in `src/ingestion/adapters/index.ts`: the real `dubaiPulseAdapter` (live fetch when configured), credentialed stubs (`stubs.ts`), SAMPLE feeds, and manual upload. See [DATA_SOURCES](DATA_SOURCES.md).

## Scheduling (`src/ingestion/scheduler.ts`)

A standalone node-cron worker (`npm run worker`, gated by `ENABLE_SCHEDULER=true`) ticks every minute and runs connectors whose `refreshFrequencyMinutes` is due, respecting locks. Suggested cadence:

| Source kind | Cadence |
| --- | --- |
| Listing feeds | 3–5 min (where allowed) |
| Broker / developer feeds | 5–15 min |
| Government transactions / rents | source cadence (often daily) |
| Rent indices / area trends | daily–hourly |
| Source-health | 5 min |
| Dedup | after each listing ingest |
| Scoring → recommendations | after ingest / comp update |

On serverless hosts use **Supabase pg_cron** or **Vercel Cron** to call `POST /api/ingestion/run` instead of an always-on worker; relax intervals to respect free-tier invocation limits (documented, never silent).

## CSV / Excel import (`src/ingestion/importers/csv.ts`)

Types: listings, transactions, rents, portfolio. The importer maps common column aliases, coerces numerics, validates required fields, and returns `{accepted, rejected, errors, preview, rows}`. Imported rows are labeled `user_entered`. The Admin tab previews before importing; portfolio rows persist via the repository, and sample data is never overwritten.

## Dedup

Listings cluster by normalized building/project + beds + size band + price proximity (+ geo distance). The canonical (highest-quality) listing is kept; others get a `duplicate_cluster_id` and are flagged. The SAMPLE dataset includes a deliberate cross-listed duplicate to exercise this.
