# Data Sources & Provenance

## Provenance is a first-class type

Every meaningful field carries a **source class** plus source id, confidence (0–1), observed-at timestamp, method and notes (`src/lib/provenance`, stored in `field_provenance` maps):

| Source class | Meaning | UI tone |
| --- | --- | --- |
| `government_verified` | DLD / ADREC / official registries | blue (official) |
| `portal_provided` | Property Finder / Bayut / Dubizzle authorized feeds | neutral |
| `broker_developer_provided` | broker CRM / developer inventory feeds | amber |
| `model_inferred` | estimated/derived by our models (always labeled) | purple |
| `user_entered` | typed by the user (portfolio, notes, imports) | neutral |
| `source_provided` | raw from an originating system, class not refined | neutral |
| `unavailable` | genuinely not known — shown as such, never guessed | gray |

The UI renders per-field `SourceBadge` / `ConfidenceBadge` / `TimestampBadge` and a hoverable provenance dot (`ProvenanceValue`).

## Connectors (`src/ingestion/adapters`)

| Connector | Class | Status in this build |
| --- | --- | --- |
| **Dubai Pulse / DLD open data** (`dld_open_data`) | government_verified | **Real fetch** when `DLD_OPENDATA_TRANSACTIONS_URL` is set; else `not_configured` (serves SAMPLE) |
| DLD Gateway, Dubai REST | government_verified | Stub — needs `DLD_GATEWAY_API_KEY` / `DUBAI_REST_API_KEY` |
| ADREC, Abu Dhabi Rental Index, DARI | government_verified | Stub — needs `ADREC_API_KEY` / `DARI_API_KEY` (AUH coverage thinner than Dubai) |
| Property Finder, Bayut, Dubizzle | portal_provided | Stub — needs authorized API key + feed URL (**no scraping**) |
| Broker CSV, Developer inventory | broker_developer_provided | SAMPLE feeds in this build; CSV import is live |
| Manual upload | user_entered | Live CSV/Excel import (Admin tab) |
| Valuation & scoring engine | model_inferred | Live (decision support) |

Every adapter implements the `Adapter` interface (`src/ingestion/core/adapter.ts`): declares type/class/official/refresh; `validateCredentials()` returns setup instructions when missing (**never throws**); `run()` fetches → normalizes → reports a job result. Missing credentials never break the dashboard.

## SAMPLE data

The default backend serves a deterministic, labeled SAMPLE dataset (`src/db/seed`): 13 areas (Dubai + Abu Dhabi), 8 developers, 12 projects, ~22 listings (incl. a duplicate cluster and an unknown-size edge case), hundreds of generated government transactions/rents, payment plans, and a sample portfolio. Everything is `is_sample=true`, badged **SAMPLE**, and excluded from production queries when `EXCLUDE_SAMPLE_DATA=true`. Sample and real data are never silently mixed.

## Real open data

Dubai Land Department publishes open transaction & rent-contract datasets via Dubai Pulse. Point `DLD_OPENDATA_TRANSACTIONS_URL` at the current CSV endpoint (or a local mirror) and run the connector from **Admin → Run now** or `POST /api/ingestion/run`. The adapter is defensive (8s timeout, row cap, parse-error tolerance) and degrades to SAMPLE on failure.
