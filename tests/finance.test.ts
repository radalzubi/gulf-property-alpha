import { describe, it, expect } from "vitest";
import { irr, npv, monthlyMortgagePayment, amortizationSchedule, dscr, breakEvenOccupancy, paybackPeriodYears, analyzePaymentPlan } from "@/lib/finance";

describe("finance: npv & irr", () => {
  it("npv discounts correctly", () => {
    expect(npv(0.1, [-1000, 1100])).toBeCloseTo(0, 6);
    expect(npv(0, [-100, 50, 50, 50])).toBe(50);
  });

  it("irr solves a simple stream", () => {
    const r = irr([-1000, 100, 100, 1100]);
    expect(r).not.toBeNull();
    expect(r!).toBeCloseTo(0.1, 3);
  });

  it("irr returns null for all-positive cashflows", () => {
    expect(irr([100, 100, 100])).toBeNull();
  });
});

describe("finance: mortgage & coverage", () => {
  it("computes a standard amortizing payment", () => {
    const pay = monthlyMortgagePayment(1_000_000, 5, 25);
    expect(pay).toBeGreaterThan(5800);
    expect(pay).toBeLessThan(5900);
  });

  it("amortization fully repays the loan", () => {
    const rows = amortizationSchedule(500_000, 4, 20);
    expect(rows.length).toBe(240);
    expect(rows[rows.length - 1].balance).toBeCloseTo(0, 2);
  });

  it("dscr & break-even", () => {
    expect(dscr(100_000, 50_000)).toBe(2);
    expect(dscr(100_000, 0)).toBeNull();
    expect(breakEvenOccupancy(100_000, 30_000, 20_000)).toBeCloseTo(0.5, 6);
    expect(paybackPeriodYears(200_000, 40_000)).toBe(5);
  });
});

describe("finance: payment plan analysis", () => {
  it("splits cash exposure across milestones", () => {
    const schedule = [
      { monthOffset: 0, percent: 20, milestone: "booking" },
      { monthOffset: 12, percent: 30, milestone: "construction" },
      { monthOffset: 24, percent: 50, milestone: "handover" },
    ];
    const a = analyzePaymentPlan(1_000_000, schedule, 24);
    expect(a.totalBeforeHandoverPct).toBe(50); // 20 + 30 before handover (m24)
    expect(a.totalBeforeHandoverAed).toBe(500_000);
    expect(a.handoverExposureAed).toBe(500_000);
    expect(a.deferralBenefitAnnualPct).not.toBeNull();
    expect(a.deferralBenefitAnnualPct!).toBeGreaterThan(0); // deferring has positive PV
  });
});
