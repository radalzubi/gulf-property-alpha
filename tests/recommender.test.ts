import { describe, it, expect } from "vitest";
import { buildSampleDataset } from "@/db/seed";
import { SEED_NOW } from "@/db/seed/prng";
import { buildScoredListing, type ScoringContext } from "@/lib/scoring";
import { rankRecommendations, similaritySets, PRESET_PROFILES, PROFILE_BY_ID } from "@/lib/recommender";
import type { Area, Developer, PaymentPlan, Project, ScoredListing } from "@/types/domain";

const ds = buildSampleDataset();
const ctx: ScoringContext = {
  transactions: ds.transactions,
  rents: ds.rents,
  areaById: new Map(ds.areas.map((a) => [a.id, a] as [string, Area])),
  developerById: new Map(ds.developers.map((d) => [d.id, d] as [string, Developer])),
  projectById: new Map(ds.projects.map((p) => [p.id, p] as [string, Project])),
  paymentPlanByListing: new Map(ds.paymentPlans.map((p) => [p.listingId, p] as [string, PaymentPlan])),
  now: SEED_NOW,
};
const scored: ScoredListing[] = ds.listings.map((l) => buildScoredListing(l, ctx));

describe("recommender ranking", () => {
  it("ranks by profile fit descending and excludes duplicates", () => {
    const recs = rankRecommendations(scored, PRESET_PROFILES[0]);
    expect(recs.length).toBeGreaterThan(0);
    for (let i = 1; i < recs.length; i++) expect(recs[i - 1].fitScore).toBeGreaterThanOrEqual(recs[i].fitScore);
    expect(recs.every((r) => !r.listing.isDuplicate)).toBe(true);
  });

  it("Off-Plan profile only returns off-plan listings", () => {
    const profile = PROFILE_BY_ID.get("offplan-payment-plan")!;
    const recs = rankRecommendations(scored, profile);
    expect(recs.length).toBeGreaterThan(0);
    expect(recs.every((r) => r.listing.readyState === "Off-Plan")).toBe(true);
  });

  it("every recommendation carries reasons + confidence", () => {
    const recs = rankRecommendations(scored, PRESET_PROFILES[0], { limit: 5 });
    for (const r of recs) {
      expect(r.reasons.length).toBeGreaterThan(0);
      expect(r.confidence).toBeGreaterThanOrEqual(0);
      expect(r.confidence).toBeLessThanOrEqual(1);
    }
  });
});

describe("similarity sets", () => {
  it("higher-yield set strictly beats the target net yield", () => {
    const target = scored.find((l) => l.id === "lst-downtown-burjvista-2br")!;
    const sets = similaritySets(target, scored);
    for (const l of sets.higherYield) {
      expect((l.score.estimatedNetYield ?? -1)).toBeGreaterThan(target.score.estimatedNetYield ?? -1);
    }
  });

  it("same-area set shares the area and excludes self", () => {
    const target = scored.find((l) => l.id === "lst-marina-vista-2br")!;
    const sets = similaritySets(target, scored);
    for (const l of sets.sameArea) {
      expect(l.areaId).toBe(target.areaId);
      expect(l.id).not.toBe(target.id);
    }
  });
});
