# Gulf Property Alpha

> Institutional real-estate **deal-finding & portfolio-management terminal** for **Dubai & Abu Dhabi**.
> Provenance-first, decision-oriented, and designed like an investment terminal — not a listings portal.

Gulf Property Alpha collects, normalizes, **scores**, compares and monitors listings, government transaction/rental data, developer/project data, neighborhood trends, yields, payment plans, and portfolio performance. Every metric carries a **source, timestamp, confidence and explanation**, and the system never fabricates data: unknown fields are shown as *unavailable*, and "reason for sale" is shown as fact only when explicitly stated.

It runs with **zero configuration** on a labeled SAMPLE dataset, and upgrades cleanly to PostgreSQL + PostGIS and real data connectors when credentials are provided.

---

## Quick start

```bash
npm install
npm run dev          # http://localhost:3000  →  redirects to /home
```

No database or credentials are required — the app serves a clearly-labeled in-memory **SAMPLE** dataset for Dubai & Abu Dhabi. Then:

```bash
npm run typecheck    # tsc --noEmit
npm test             # vitest unit suite (engines, importer, portfolio)
npm run build        # production build
```

CI (`.github/workflows/ci.yml`) runs the same three commands on every push to `main` and every pull request, and also builds the Docker image and checks that it serves the sample dataset.

### Optional: real PostgreSQL + PostGIS

```bash
cp .env.example .env.local            # set DATABASE_URL + DATA_BACKEND=postgres
npm run db:generate                   # (already generated: src/db/migrations/0000_init.sql)
npm run db:migrate                    # ensures PostGIS, applies migrations
npm run db:seed                       # loads labeled SAMPLE data into Postgres
```

### Optional: background ingestion worker

```bash
ENABLE_SCHEDULER=true npm run worker  # node-cron tick; runs due connectors
```

---

## The 12 tabs

1. **Home / Recommended Deals** — ranked opportunities, configurable weight sliders, 8 investor profiles, similarity sets.
2. **Listings Explorer** — dense filterable/sortable table, CSV export, bulk select, dedup/stale flags.
3. **Deal Detail** — sections A–I: summary (field-level provenance), official-data match, price analysis + comps, rental/yield breakdown, payment-plan timeline, developer/project, area/land history, **reason-for-sale** (labeled), and a transparent deal-score explanation.
4. **Map & Heatmap** — MapLibre with listings, deal-score, net-yield and underpriced heatmaps.
5. **Neighborhood Intelligence** — area metrics, price/rent trends, developer mix, under/over-priced buildings, comparison view.
6. **Developer & Project Intelligence** — quality/delivery risk, best/weakest deals, project profiles.
7. **Yield & Rent Analyzer** — full cashflow, levered/unlevered IRR, DSCR, break-even, sensitivity grid, bear/base/bull.
8. **Payment Plan Analyzer** — normalized schedule, cash-exposure, PV deferral benefit, vs-cash and vs-mortgage comparison.
9. **Portfolio Management** — value/equity/debt/LTV, NOI, yields, IRR, concentration, renewals, rule-based actions.
10. **Alerts & Watchlists** — opportunity/risk/portfolio alerts; in-app + email/webhook/WhatsApp-ready architecture.
11. **Data Quality / Source Health** — per-connector health and per-listing confidence/completeness.
12. **Admin / Data Connectors** — run connectors, see setup steps, CSV/Excel import with preview.

## Architecture

- **Next.js 14 (App Router) + TypeScript**, Tailwind, TanStack Query, MapLibre, Recharts.
- **Repository abstraction** (`src/lib/repo`): in-memory SAMPLE backend (default) or Postgres/Drizzle (`DATA_BACKEND`).
- **Pure engines** (`src/lib/{finance,scoring,recommender,portfolio,provenance}`) — fully unit-tested, backend-agnostic.
- **Ingestion** (`src/ingestion`): adapter framework, real Dubai open-data adapter + credentialed stubs, CSV importers, node-cron worker.
- **Drizzle schema + migrations** (`src/db`) for Postgres + PostGIS.

See `REAL_ESTATE_DASHBOARD_IMPLEMENTATION_PLAN.md` and the `docs/` folder:
[DATA_SOURCES](docs/DATA_SOURCES.md) · [SCORING_MODEL](docs/SCORING_MODEL.md) · [PORTFOLIO_MODEL](docs/PORTFOLIO_MODEL.md) · [INGESTION_ARCHITECTURE](docs/INGESTION_ARCHITECTURE.md) · [ENVIRONMENT_VARIABLES](docs/ENVIRONMENT_VARIABLES.md) · [COMPLIANCE_NOTES](docs/COMPLIANCE_NOTES.md).

## What is mock vs real

- **SAMPLE (mock):** all listings, areas, developers, projects, transactions, rents, payment plans and portfolio in the default backend. Tagged `is_sample` and badged **SAMPLE** in the UI; never silently mixed with real data.
- **Real, no credentials needed:** the **Dubai open-data (Dubai Pulse / DLD)** adapter performs a live fetch when `DLD_OPENDATA_TRANSACTIONS_URL` is set; otherwise reports `not_configured`.
- **Requires credentials (stubbed):** Property Finder, Bayut, Dubizzle, DLD Gateway, Dubai REST, ADREC, Abu Dhabi Rental Index, DARI. They return `not_configured` with setup instructions and never crash the app.

## Compliance (summary)

Portal data only via authorized APIs/feeds — **no scraping**. No private owner contact unless publicly provided & legally usable. Scores are **decision support, not financial advice**. Golden Visa eligibility is a flag requiring legal verification. Full notes in [docs/COMPLIANCE_NOTES.md](docs/COMPLIANCE_NOTES.md).

## Deployment

Cheapest private path: **Supabase (DB) + Vercel (app)** with a custom domain ($0 to start). Cheapest fully-owned: a single small VPS via `docker-compose.yml` (Postgres+PostGIS + app + worker). The app only needs `DATABASE_URL`.
