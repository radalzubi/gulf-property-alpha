# Scoring Model

All scoring lives in `src/lib/scoring` and is pure + unit-tested (`tests/scoring.test.ts`). Scores are **decision-support signals, not financial advice**.

## Total Deal Score (0–100)

A weighted blend of sub-scores minus a missing-data penalty, clamped to 0–100. Default weights (user-editable via the Home sliders / recommendation profiles; re-normalized to 100):

| Signal | Default weight |
| --- | --- |
| Price discount to fair value | 25 |
| Expected net yield | 20 |
| Rent demand / tenant strength | 10 |
| Liquidity / transaction volume | 10 |
| Area price momentum | 10 |
| Developer / project quality | 10 |
| Payment-plan attractiveness | 5 |
| Risk adjustment | 5 |
| Data confidence | 5 |

`total = Σ(subScore · weight)/100 − missingDataPenalty` (see `dealScore.ts::computeTotal`).

## Fair value (`fairValue.ts`)

Comparable transactions are selected with a tier hierarchy and weighted:

1. **same building** (1.0) → 2. **same project** (0.8) → 3. **same area** (0.55) → 4. **neighborhood** (0.3).

Each comp weight = `tierWeight × recencyFactor × similarity`, where recency halves every ~180 days, and similarity blends bedroom match, size proximity and property-type match. PSF outliers are trimmed (IQR), and fair PSF is the **weighted median**. Fair value = fairPSF × size. Low/high = 25th/75th-percentile PSF × size. `valueGapPercent = (asking − fairValue)/fairValue` (negative = discount).

**Confidence** rises with comp count, closeness (building/project tiers), recency and similarity, and drops if size is unknown.

## Rent estimate (`rent.ts`)

Priority: official rent records → same-building → same-area → neighborhood comps (recency/similarity weighted), with an area-median fallback at lower confidence. Returns median + low/high + a **tenant-demand** proxy from comp density and renewal share.

## Net yield (`yield.ts`)

```
NOI = effectiveGrossRent − serviceCharge − management − maintenance − insurance − other
effectiveGrossRent = grossRent − vacancyAllowance
allInCost = price + transfer/registration% + broker% + conveyancing + furnishing + renovation
netYield = NOI / allInCost          grossYield = grossRent / price
```

Transfer fee defaults: Dubai 4%, Abu Dhabi 2%. If the source omits the service charge, a per-sqft fallback is used and the result is flagged *assumed* (and a missing-data penalty applied).

## Risk (higher = safer)

Starts at 100, subtracting for: off-plan delivery, developer delivery risk, low area liquidity, stale listing, abnormally deep discount ("too good to be true"), high service charge, weak rent demand, very aggressive payment deferral, **unknown size**, unsupported rent, and area vacancy risk. Mapped to a label: **Low ≥78 · Moderate ≥60 · Elevated ≥42 · High <42**.

## Confidence (0–1)

`0.38·fairValueConfidence + 0.27·rentConfidence + 0.15·fieldCompleteness + 0.20·sourceReliability`, minus penalties for duplicate/stale. Source reliability by class: government 0.95, portal 0.75, broker/developer 0.60, user 0.55, model 0.50.

## Missing-data penalty

Explicit points off the total: unknown size −18, no rent estimate −10, no comps −12, assumed service charge −3. Every score persists a plain-English `explanation[]` shown in Deal Detail § I.
