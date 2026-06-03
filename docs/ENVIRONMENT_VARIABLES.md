# Environment Variables

The app runs with **zero configuration** (in-memory SAMPLE data). Missing credentials never crash it — connectors report `not_configured`. Copy `.env.example` to `.env.local` (Next.js) and/or `.env` (scripts/worker).

## Core

| Variable | Default | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | — | Postgres + PostGIS connection string. Unset → in-memory SAMPLE repository. |
| `DATA_BACKEND` | `auto` | `auto` (postgres if `DATABASE_URL` set, else memory), `memory`, or `postgres`. |
| `EXCLUDE_SAMPLE_DATA` | `false` | When `true`, production queries exclude `is_sample` rows. |

## Real open data (Dubai)

| Variable | Purpose |
| --- | --- |
| `DLD_OPENDATA_BASE_URL` | Base for DLD/Dubai Pulse open data (optional). |
| `DLD_OPENDATA_TRANSACTIONS_URL` | CSV endpoint/mirror for DLD transactions — enables the **real** fetch. |
| `DLD_OPENDATA_RENTS_URL` | CSV endpoint/mirror for DLD rent contracts. |

## Portal / official connectors (optional; stubbed until set)

`PROPERTY_FINDER_API_KEY`, `PROPERTY_FINDER_FEED_URL`, `BAYUT_API_KEY`, `BAYUT_FEED_URL`, `DUBIZZLE_API_KEY`, `DUBIZZLE_FEED_URL`, `DLD_GATEWAY_API_KEY`, `DUBAI_REST_API_KEY`, `ADREC_API_KEY`, `DARI_API_KEY`.

All portal feeds must be **authorized APIs/licensed feeds** — no scraping.

## Map / alerts / scheduler

| Variable | Purpose |
| --- | --- |
| `NEXT_PUBLIC_MAP_STYLE_URL` | Custom MapLibre style (default: free MapLibre demo style — no token). |
| `SMTP_URL`, `ALERT_EMAIL_FROM` | Email alert delivery (architecture only). |
| `ALERT_WEBHOOK_URL` | Webhook alert delivery (architecture only). |
| `WHATSAPP_API_TOKEN` | WhatsApp delivery (architecture only — no external sends without it). |
| `ENABLE_SCHEDULER` | `true` to start the in-process node-cron worker. |
