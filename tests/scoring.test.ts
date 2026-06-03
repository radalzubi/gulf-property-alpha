import { describe, it, expect, beforeAll } from "vitest";
import { buildSampleDataset } from "@/db/seed";
import { SEED_NOW } from "@/db/seed/prng";
import { scoreListing, type ScoringContext, computeYield, defaultAssumptions, estimateFairValue, estimateRent } from "@/lib/scoring";
import type { Area, Developer, PaymentPlan, Project } from "@/types/domain";

let ctx: ScoringContext;
const ds = buildSampleDataset();

beforeAll(() => {
  ctx = {
    transactions: ds.transactions,
    rents: ds.rents,
    areaById: new Map(ds.areas.map((a) => [a.id, a] as [string, Area])),
    developerById: new Map(ds.developers.map((d) => [d.id, d] as [string, Developer])),
    projectById: new Map(ds.projects.map((p) => [p.id, p] as [string, Project])),
    paymentPlanByListing: new Map(ds.paymentPlans.map((p) => [p.listingId, p] as [string, PaymentPlan])),
    now: SEED_NOW,
  };
});

const find = (id: string) => ds.listings.find((l) => l.id === id)!;

describe("fair value & comps", () => {
  it("finds comps and estimates a fair value for a known building", () => {
    const fv = estimateFairValue(find("lst-marina-vista-2br"), ds.transactions, { now: SEED_NOW });
    expect(fv.compCount).toBeGreaterThan(0);
    expect(fv.estimatedValueAed).toBeGreaterThan(0);
    expect(fv.confidence).toBeGreaterThan(0);
  });

  it("returns no value when size is unknown", () => {
    const fv = estimateFairValue(find("lst-jlt-saba-1br-nosize"), ds.transactions, { now: SEED_NOW });
    expect(fv.estimatedValueAed).toBeNull();
  });
});

describe("rent estimate", () => {
  it("produces a positive annual rent for a normal listing", () => {
    const r = estimateRent(find("lst-jvc-bloom-studio"), ds.rents, { now: SEED_NOW });
    expect(r.annualRentAed).toBeGreaterThan(0);
    expect(r.confidence).toBeGreaterThan(0);
  });
});

describe("yield math", () => {
  it("net yield is below gross yield (costs subtracted)", () => {
    const y = computeYield({ askingPriceAed: 1_000_000, estimatedAnnualRentAed: 80_000, sizeSqft: 800, serviceChargePsf: 16, assumptions: defaultAssumptions("Dubai") });
    expect(y.grossYieldPct).toBeCloseTo(8, 5);
    expect(y.netYieldPct!).toBeLessThan(y.grossYieldPct!);
    expect(y.allInAcquisitionCostAed).toBeGreaterThan(1_000_000);
  });
});

describe("deal score", () => {
  it("scores an undervalued listing with a discount and decent score", () => {
    const s = scoreListing(find("lst-marina-vista-2br"), ctx);
    expect(s.valueGapPercent).not.toBeNull();
    expect(s.valueGapPercent!).toBeLessThan(0); // priced below fair value
    expect(s.totalDealScore).toBeGreaterThanOrEqual(0);
    expect(s.totalDealScore).toBeLessThanOrEqual(100);
    expect(s.explanation.length).toBeGreaterThan(0);
  });

  it("penalizes a listing with unknown size (missing-data penalty + lower confidence)", () => {
    const s = scoreListing(find("lst-jlt-saba-1br-nosize"), ctx);
    expect(s.breakdown.missingDataPenalty).toBeGreaterThan(0);
    expect(s.estimatedNetYield).toBeNull();
    expect(s.overallConfidence).toBeLessThan(0.6);
  });

  it("assigns a risk label from the risk sub-score", () => {
    const s = scoreListing(find("lst-businessbay-damacbay-1br"), ctx);
    expect(["Low", "Moderate", "Elevated", "High"]).toContain(s.riskLabel);
  });
});
