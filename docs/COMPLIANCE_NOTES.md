# Compliance Notes

These constraints are intrinsic to the product. They are enforced in code where possible and documented where they require operational discipline.

## Data acquisition

- **Portal data only via authorized APIs / licensed feeds / broker CRM exports / compliant access.** No scraping is performed anywhere in this codebase. Portal connectors (Property Finder, Bayut, Dubizzle) are stubs that activate only with authorized credentials.
- **Government/official data** is used wherever possible (DLD/Dubai Pulse open data live; DLD Gateway, Dubai REST, ADREC, DARI behind authorized credentials).
- Respect source **rate limits and update frequency**. Official data update cadence may not support minute-by-minute refresh; the scheduler honors per-source frequencies and relaxes them on constrained hosts (documented, never silent).

## Personal data

- **Private owner contact information is never scraped or exposed.** Only agent/agency contact data that is publicly provided and legally usable is shown; it is labeled by source class.

## Honesty & provenance

- **No fabricated data.** Unknown fields are shown as *unavailable*, never guessed.
- **Reason for sale** is shown as fact (high confidence) only when explicitly stated in the listing text, broker/developer notes, or user notes. Otherwise it is a clearly-labeled `model_inferred` hypothesis with medium/low/unknown confidence and its supporting evidence listed.
- Every metric carries a **source, timestamp, confidence and explanation**. All model-inferred outputs are labeled (purple tone / "Model-inferred" badge).
- **SAMPLE data** is always labeled and never silently mixed with production data.

## Decision support, not advice

- Deal scores, valuations, rent estimates, yields and recommendations are **decision-support signals, not financial, investment, legal or tax advice**. Users must do their own due diligence.
- **Golden Visa eligibility** (where surfaced) is a flag requiring independent **legal verification** — not a determination.

## Coverage

- Government data coverage **differs between Dubai and Abu Dhabi**; Abu Dhabi (ADREC/DARI) coverage is thinner. The UI notes this where relevant.
- Exact land-parcel history is often unavailable; the product shows area-level transaction trends instead, clearly stated.
