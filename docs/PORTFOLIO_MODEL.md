# Portfolio Model

Implemented in `src/lib/portfolio/index.ts` (`computePortfolioSummary`), unit-tested in `tests/portfolio.test.ts`.

## Asset inputs (`portfolio_assets`)

Per asset: name, status (Owned / Planned / Watch / Hypothetical / Sold / Off-Plan), emirate, area, building/project, developer, type, size, purchase price, acquisition date, current value, annual rent, occupancy, lease start/end, mortgage balance, interest rate, monthly payment, service charges, maintenance, management fee, insurance, other expenses, notes. All **user-entered** and never mixed with SAMPLE listings.

## Computed metrics

```
opex(asset)   = serviceCharges + maintenance + managementFee + insurance + other
totalValue    = Σ currentValue (non-sold)
debt          = Σ mortgageBalance
equity        = totalValue − debt          ltv = debt / totalValue
annualRent    = Σ annualRent (income assets)
NOI           = annualRent − Σ opex
grossYield    = annualRent / totalValue    netYield = NOI / totalValue
annualDebtSvc = Σ monthlyPayment × 12
cashOnCash    = (NOI − annualDebtSvc) / equity
DSCR          = NOI / annualDebtSvc
unrealizedGain= Σ (currentValue − purchasePrice)
realizedGain  = Σ (soldPrice − purchasePrice) for sold assets
```

**Portfolio IRR** (labeled *approximate*) is solved from a synthesized annual series: `−Σ purchasePrice` at t0, annual net cashflow each year, plus terminal equity `(totalValue − debt)` in the final year, over the average holding period.

## Exposure & risk

- Geographic & developer **concentration** (% of value).
- **Off-plan / ready / vacancy** exposure (% of value).
- **Risk score** (0–100, higher = riskier): weighted blend of concentration above thresholds, LTV, vacancy and off-plan exposure.

## Rule-based actions (decision support)

- LTV > 60% → deleverage / refinance signal.
- Single emirate > 60% or single developer > 50% → diversification warning.
- Vacancy exposure > 15% → lease-up priority.
- Lease ending ≤ 12 months → renewal review (vs market / RERA index); ≤ 3 months escalates.
- Asset net yield materially below portfolio net yield → underperformer review (sell/hold).

These surface on the Portfolio tab and as portfolio alerts. They are signals, not advice.
