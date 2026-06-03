# Gulf Property Alpha — Real Estate Dashboard Implementation Plan

> Institutional real-estate **deal-finding & portfolio-management terminal** for **Dubai & Abu Dhabi**, extensible to Sharjah, RAK, Riyadh, Jeddah, Doha and other GCC markets.

This is the in-repo copy of the approved implementation plan. It is the single source of truth for architecture and scope.

---

## Current Repo Assessment

Greenfield. The product is built from scratch as a **Next.js 14 (App Router) + TypeScript** full-stack application with a **PostgreSQL + PostGIS** data layer (Drizzle ORM), and a portable, Postgres-backed ingestion worker. There is no legacy code to preserve.

Local tooling: Node 20, npm 10, Python 3.14, git. No Docker / local Postgres; Supabase (cloud Postgres + PostGIS) is the recommended database.

## Proposed Architecture

- **App**: single Next.js app — UI (App Router, 12 tabs under a `(dashboard)` group) + API route handlers under `/api`.
- **Data layer**: a **repository abstraction** with two backends:
  - `MemoryRepository` — reads labeled **SAMPLE** seed data; the default so the app runs with **zero configuration**.
  - `PostgresRepository` — Drizzle + `postgres.js` against Postgres/PostGIS for production.
  - Selection via `DATA_BACKEND` (`auto|memory|postgres`).
- **Engines** (pure, unit-tested TypeScript, backend-agnostic): `lib/finance`, `lib/scoring`, `lib/recommender`, `lib/provenance`.
- **Ingestion**: `ingestion/core` (Adapter interface, job runner, source advisory locks, idempotent upserts, dedup, raw archive), `ingestion/adapters` (real Dubai open-data + stubs), `ingestion/importers` (CSV/Excel), `ingestion/scheduler.ts` (node-cron worker; or Supabase pg_cron / Vercel Cron on serverless).

## Data-Source Strategy

Provenance is a first-class type. Every meaningful field carries a **source class** — `source_provided | government_verified | portal_provided | broker_developer_provided | model_inferred | user_entered | unavailable` — plus source id, confidence (0–1), observed-at timestamp, method, and notes, stored in a `field_provenance` JSON map alongside typed value columns.

- **Real now**: Dubai Pulse / DLD **open** transaction & rent datasets (`government_verified`). Robust fetch → archive → normalize; degrades to `not_configured` on failure. Never scraped.
- **Stubbed** (return `not_configured` + setup instructions, never crash): DLD Gateway, Dubai REST, ADREC, Abu Dhabi Rental Index, DARI, Property Finder, Bayut, Dubizzle, Developer inventory.
- **User-provided**: broker CSV / manual CSV-Excel upload (`user_entered` / `broker_developer_provided`).

Sample data is tagged `is_sample=true`, badged **SAMPLE** in the UI, and can be excluded from production queries (`EXCLUDE_SAMPLE_DATA`). Sample and real data never silently mix.

## Database Schema

Postgres + PostGIS via Drizzle. Tables: `users`, `sources`, `ingestion_jobs`, `raw_records`, `areas` (+ boundary geom), `developers`, `projects` (+ point geom), `normalized_listings` (+ point geom, `field_provenance`, dedup + quality fields), `government_transactions`, `government_rents`, `market_series`, `comps`, `listing_scores`, `payment_plans`, `reason_for_sale`, `recommendation_profiles`, `portfolio_assets`, `portfolio_cashflows`, `watchlists`, `watchlist_items`, `alerts`, `import_batches`. Idempotent upserts on `(source_id, external_id)`; `last_seen` drives stale detection; GIST indexes on geometry.

## Scoring Methodology

Transparent 0–100 deal score. Default weights (user-editable): price-discount 25, net-yield 20, rent-demand 10, liquidity 10, area-momentum 10, developer/project 10, payment-plan 5, risk-adj 5, data-confidence 5. Fair value via comp hierarchy (same building → project → neighborhood → area), recency/similarity weighting and outlier removal. Rent estimate via official rents → building/project comps → neighborhood comps. Net yield = NOI / all-in acquisition cost. Confidence and risk are composed from explicit factors. Missing-data penalty is explicit. Every score persists a plain-English explanation. See `docs/SCORING_MODEL.md`.

## Recommender Methodology

Weighted ranking against an investor **profile** plus similarity sets (by price, higher yield, better-value, safer, higher-upside, same-area, same-developer, better payment terms, better liquidity, portfolio-fit). Each recommendation explains *why*, lists comps considered, matched preferences, major risks, missing data and confidence. Preset profiles: High Yield, Capital Appreciation, Conservative Income, Off-Plan Payment Plan, Family Office Long Hold, Flip/Resale, Low Down Payment, Tenant-Ready Cashflow.

## UI Map

Premium dark "investment terminal": sidebar nav + global search/filters, KPI cards, dense sortable tables, charts, map, compact cards, provenance/confidence/risk/source/timestamp badges, skeleton/empty/error states. Twelve tabs: Home/Recommended, Listings Explorer, Deal Detail, Map & Heatmap, Neighborhood Intelligence, Developer & Project Intelligence, Yield & Rent Analyzer, Payment Plan Analyzer, Portfolio Management, Alerts & Watchlists, Data Quality / Source Health, Admin / Data Connectors.

## Implementation Phases

1. Foundation — scaffold, schema, provenance, theme, sample data.
2. Engines — finance, scoring, recommender (+ unit tests).
3. Shell + Tabs 1–3 (Home, Listings, Deal Detail).
4. Tabs 4–6 (Map, Neighborhood, Developer/Project).
5. Tabs 7–8 (Yield, Payment Plan).
6. Tab 9 Portfolio + Tab 10 Alerts/Watchlists.
7. Tabs 11–12 + ingestion adapters/importers/scheduler.
8. Hardening — tests, docs, deployment.

## Risks & Limitations

Government open data may be sparse/lagging or change format (adapter degrades gracefully). Free-tier scheduling can't truly run minute-level for all sources (intervals relax, documented). Portal/official gateway APIs need credentials we don't have (stubbed). Valuations/yields are **model estimates with confidence**, not guarantees. Abu Dhabi coverage is thinner than Dubai. Sample data is illustrative and clearly labeled.

## Compliance Notes

Portal data only via authorized APIs/feeds — **no scraping**. No private owner contact unless publicly provided & legally usable. Reason-for-sale is never invented. Scores are decision-support, **not financial advice**. Golden Visa eligibility is a flag requiring legal verification. See `docs/COMPLIANCE_NOTES.md`.

## Testing Plan

Vitest unit tests for normalization, dedup, comp selection, fair value, rent estimate, gross/net yield, deal score, confidence, risk, payment-plan parser, portfolio metrics, recommender ranking, source health, importer validation. API + empty/error states covered. Seed-data-driven for determinism.

## Deployment Plan

Cheapest private path: **Supabase (DB) + Vercel (app)** = $0 to start, custom-domain capable. Cheapest fully-owned: single small VPS + `docker-compose` (Postgres+PostGIS + app + worker). App is portable — only needs `DATABASE_URL`. See `docs/ENVIRONMENT_VARIABLES.md`.
