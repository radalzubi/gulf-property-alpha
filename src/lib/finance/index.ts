/**
 * Finance primitives for the Yield & Rent Analyzer, Payment Plan Analyzer and
 * Portfolio engine. Pure functions, fully unit-tested. AED throughout.
 */

/** Net present value. `cashflows[0]` occurs at t=0; rate is per-period. */
export function npv(ratePerPeriod: number, cashflows: number[]): number {
  return cashflows.reduce((acc, cf, t) => acc + cf / Math.pow(1 + ratePerPeriod, t), 0);
}

/**
 * Internal rate of return per period. Returns null if it cannot converge
 * (e.g. all-positive or all-negative cashflows).
 */
export function irr(cashflows: number[], guess = 0.1): number | null {
  if (cashflows.length < 2) return null;
  const hasPos = cashflows.some((c) => c > 0);
  const hasNeg = cashflows.some((c) => c < 0);
  if (!hasPos || !hasNeg) return null;

  // Newton-Raphson with a bisection fallback for robustness.
  let rate = guess;
  for (let i = 0; i < 80; i++) {
    let f = 0;
    let df = 0;
    for (let t = 0; t < cashflows.length; t++) {
      const denom = Math.pow(1 + rate, t);
      f += cashflows[t] / denom;
      if (t > 0) df += (-t * cashflows[t]) / Math.pow(1 + rate, t + 1);
    }
    if (Math.abs(f) < 1e-7) return rate;
    if (df === 0) break;
    const next = rate - f / df;
    if (!Number.isFinite(next)) break;
    rate = next;
    if (rate <= -0.9999) rate = -0.99;
  }

  // Bisection over a wide bracket.
  let lo = -0.9999;
  let hi = 10;
  const fAt = (r: number) => npv(r, cashflows);
  let flo = fAt(lo);
  let fhi = fAt(hi);
  if (flo * fhi > 0) return null;
  for (let i = 0; i < 200; i++) {
    const mid = (lo + hi) / 2;
    const fm = fAt(mid);
    if (Math.abs(fm) < 1e-7) return mid;
    if (flo * fm < 0) {
      hi = mid;
      fhi = fm;
    } else {
      lo = mid;
      flo = fm;
    }
  }
  return (lo + hi) / 2;
}

/** Annualize a per-period (monthly) IRR. */
export const annualizeMonthlyIrr = (monthly: number | null) =>
  monthly == null ? null : Math.pow(1 + monthly, 12) - 1;

/** Standard fully-amortizing monthly payment. */
export function monthlyMortgagePayment(principal: number, annualRatePct: number, years: number): number {
  if (principal <= 0 || years <= 0) return 0;
  const r = annualRatePct / 100 / 12;
  const n = years * 12;
  if (r === 0) return principal / n;
  return (principal * r) / (1 - Math.pow(1 + r, -n));
}

export interface AmortRow {
  month: number;
  payment: number;
  interest: number;
  principal: number;
  balance: number;
}

export function amortizationSchedule(principal: number, annualRatePct: number, years: number): AmortRow[] {
  const pay = monthlyMortgagePayment(principal, annualRatePct, years);
  const r = annualRatePct / 100 / 12;
  const n = years * 12;
  const rows: AmortRow[] = [];
  let balance = principal;
  for (let m = 1; m <= n; m++) {
    const interest = balance * r;
    const principalPaid = Math.min(pay - interest, balance);
    balance = Math.max(0, balance - principalPaid);
    rows.push({ month: m, payment: pay, interest, principal: principalPaid, balance });
  }
  return rows;
}

/** Debt-service coverage ratio: NOI / annual debt service. */
export function dscr(noi: number, annualDebtService: number): number | null {
  if (annualDebtService <= 0) return null;
  return noi / annualDebtService;
}

/** Years to recover the initial equity from annual net cashflow (simple). */
export function paybackPeriodYears(initialEquity: number, annualNetCashflow: number): number | null {
  if (annualNetCashflow <= 0) return null;
  return initialEquity / annualNetCashflow;
}

/**
 * Break-even occupancy: the share of gross potential rent needed to cover
 * operating expenses + debt service. Returns a fraction 0..1 (can exceed 1).
 */
export function breakEvenOccupancy(grossPotentialRent: number, operatingExpenses: number, annualDebtService: number): number | null {
  if (grossPotentialRent <= 0) return null;
  return (operatingExpenses + annualDebtService) / grossPotentialRent;
}

export interface PaymentPlanCashAnalysis {
  totalBeforeHandoverAed: number;
  totalBeforeHandoverPct: number;
  handoverExposureAed: number;
  postHandoverObligationAed: number;
  /** Monthly cashflow series from booking through end of plan (negative outflows). */
  monthlySeries: number[];
  /** IRR impact: a positive number means the plan's deferral is worth ~X% vs full upfront cash. */
  deferralBenefitAnnualPct: number | null;
}

/**
 * Analyzes a normalized payment-plan schedule against the total price.
 * `schedule` is {monthOffset, percent}[]; `discountRate` is the buyer's annual
 * opportunity cost (e.g. 0.06). The plan's PV is compared to paying 100% today.
 */
export function analyzePaymentPlan(
  totalPriceAed: number,
  schedule: { monthOffset: number; percent: number; milestone?: string }[],
  handoverMonths: number,
  discountAnnualRate = 0.06,
): PaymentPlanCashAnalysis {
  const beforeHandover = schedule.filter((s) => s.monthOffset < handoverMonths);
  const atHandover = schedule.filter((s) => s.monthOffset === handoverMonths);
  const postHandover = schedule.filter((s) => s.monthOffset > handoverMonths);

  const pctToAed = (pct: number) => (pct / 100) * totalPriceAed;
  const totalBeforeHandoverPct = beforeHandover.reduce((s, x) => s + x.percent, 0);

  const lastMonth = schedule.reduce((m, s) => Math.max(m, s.monthOffset), 0);
  const monthlySeries = new Array(lastMonth + 1).fill(0);
  for (const s of schedule) monthlySeries[s.monthOffset] -= pctToAed(s.percent);

  // PV of the plan vs PV of 100% today (which is just totalPriceAed).
  const rMonthly = discountAnnualRate / 12;
  const planPv = schedule.reduce((acc, s) => acc + pctToAed(s.percent) / Math.pow(1 + rMonthly, s.monthOffset), 0);
  const savingPv = totalPriceAed - planPv; // positive = deferral is valuable
  const deferralBenefitAnnualPct = totalPriceAed > 0 ? (savingPv / totalPriceAed) * 100 : null;

  return {
    totalBeforeHandoverAed: beforeHandover.reduce((s, x) => s + pctToAed(x.percent), 0),
    totalBeforeHandoverPct,
    handoverExposureAed: atHandover.reduce((s, x) => s + pctToAed(x.percent), 0),
    postHandoverObligationAed: postHandover.reduce((s, x) => s + pctToAed(x.percent), 0),
    monthlySeries,
    deferralBenefitAnnualPct,
  };
}
