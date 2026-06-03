import { describe, it, expect } from "vitest";
import { buildSampleDataset } from "@/db/seed";
import { SEED_NOW } from "@/db/seed/prng";
import { computePortfolioSummary } from "@/lib/portfolio";

const ds = buildSampleDataset();

describe("portfolio metrics", () => {
  const summary = computePortfolioSummary(ds.portfolio, SEED_NOW);

  it("aggregates value, equity and debt consistently", () => {
    expect(summary.totalValue).toBeGreaterThan(0);
    expect(summary.equity).toBeCloseTo(summary.totalValue - summary.debt, 2);
  });

  it("computes yields and concentration", () => {
    expect(summary.grossYield).toBeGreaterThan(0);
    expect(summary.netYield).toBeLessThanOrEqual(summary.grossYield);
    const totalGeo = summary.geographicConcentration.reduce((s, c) => s + c.pct, 0);
    expect(totalGeo).toBeGreaterThan(99); // ~100% of value allocated
    expect(totalGeo).toBeLessThan(101);
  });

  it("flags lease renewals within 12 months and emits actions", () => {
    expect(Array.isArray(summary.rentRenewals)).toBe(true);
    expect(summary.recommendedActions.length).toBeGreaterThan(0);
  });

  it("LTV is between 0 and 100", () => {
    expect(summary.ltv).toBeGreaterThanOrEqual(0);
    expect(summary.ltv).toBeLessThanOrEqual(100);
  });
});
