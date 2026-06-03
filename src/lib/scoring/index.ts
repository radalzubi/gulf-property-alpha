import type {
  Area,
  Developer,
  GovRent,
  GovTransaction,
  Listing,
  ListingScore,
  PaymentPlan,
  Project,
  ScoredListing,
  ScoreBreakdown,
  ScoringWeights,
} from "@/types/domain";
import type { SourceClass } from "@/lib/provenance";
import { completeness } from "@/lib/provenance";
import { clamp } from "@/lib/utils";
import { analyzePaymentPlan } from "@/lib/finance";
import { estimateFairValue } from "./fairValue";
import { estimateRent } from "./rent";
import { computeYield, defaultAssumptions } from "./yield";
import {
  DEFAULT_WEIGHTS,
  computeTotal,
  riskLabelFromScore,
  scoreFromDiscount,
  scoreFromLiquidity,
  scoreFromMomentum,
  scoreFromNetYield,
} from "./dealScore";

export * from "./dealScore";
export * from "./fairValue";
export * from "./rent";
export * from "./yield";

export interface ScoringContext {
  transactions: GovTransaction[];
  rents: GovRent[];
  areaById: Map<string, Area>;
  developerById: Map<string, Developer>;
  projectById: Map<string, Project>;
  paymentPlanByListing: Map<string, PaymentPlan>;
  weights?: ScoringWeights;
  now?: Date;
}

const SOURCE_RELIABILITY: Record<SourceClass, number> = {
  government_verified: 0.95,
  source_provided: 0.7,
  portal_provided: 0.75,
  broker_developer_provided: 0.6,
  user_entered: 0.55,
  model_inferred: 0.5,
  unavailable: 0.3,
};

const KEY_FIELDS = ["askingPriceAed", "sizeSqft", "bedrooms", "serviceChargePsf", "occupancyStatus", "developerId"];

export function computePaymentPlanScore(listing: Listing, plan: PaymentPlan | undefined, developer: Developer | undefined): number {
  if (!plan || !listing.askingPriceAed) return 50; // neutral for ready/no-plan
  const handoverMonths = plan.handoverMonths ?? 24;
  const a = analyzePaymentPlan(listing.askingPriceAed, plan.schedule, handoverMonths);
  // Lower upfront (pre-handover) cash = more attractive.
  const upfrontScore = clamp(100 - a.totalBeforeHandoverPct, 0, 100) * 0.5;
  const postHandoverBonus = (plan.postHandoverPercent ?? 0) > 0 ? 15 : 0;
  const credibility = ((developer?.qualityScore ?? 55) - 55) * 0.4;
  const completionRisk = -(developer?.deliveryRiskScore ?? 25) * 0.35;
  const timingPenalty = -Math.max(0, handoverMonths - 18) * 0.3; // longer to handover = more risk
  const deferralBonus = Math.min(15, Math.max(0, a.deferralBenefitAnnualPct ?? 0));
  return clamp(40 + upfrontScore + postHandoverBonus + credibility + completionRisk + timingPenalty + deferralBonus, 0, 100);
}

export function scoreListing(listing: Listing, ctx: ScoringContext): ListingScore {
  const now = ctx.now ?? new Date();
  const weights = ctx.weights ?? DEFAULT_WEIGHTS;
  const area = ctx.areaById.get(listing.areaId);
  const developer = listing.developerId ? ctx.developerById.get(listing.developerId) : undefined;
  const project = listing.projectId ? ctx.projectById.get(listing.projectId) : undefined;
  const plan = ctx.paymentPlanByListing.get(listing.id);

  // 1. Fair value & comps
  const fv = estimateFairValue(listing, ctx.transactions, { project, now });
  const valueGapPercent =
    fv.estimatedValueAed != null && listing.askingPriceAed
      ? Math.round(((listing.askingPriceAed - fv.estimatedValueAed) / fv.estimatedValueAed) * 1000) / 10
      : null;

  // 2. Rent
  const rent = estimateRent(listing, ctx.rents, { now, areaMedianRentPsf: area?.medianRentPsf });

  // 3. Yield
  const y = computeYield({
    askingPriceAed: listing.askingPriceAed ?? 0,
    estimatedAnnualRentAed: rent.annualRentAed,
    sizeSqft: listing.sizeSqft,
    serviceChargePsf: listing.serviceChargePsf,
    assumptions: defaultAssumptions(listing.emirate),
  });

  // 4. Sub-signals
  const priceScore = scoreFromDiscount(valueGapPercent);
  const yieldScore = scoreFromNetYield(y.netYieldPct);
  const rentDemandScore = clamp(0.6 * rent.demandScore + 0.4 * (area?.tenantDemandScore ?? 60), 0, 100);
  const liquidityScore = scoreFromLiquidity(area?.liquidityScore, fv.txnVolume);
  const areaMomentumScore = scoreFromMomentum(area?.annualPriceChangePct, area?.annualRentChangePct);
  const developerScore = developer?.qualityScore ?? 55;
  const paymentPlanScore = computePaymentPlanScore(listing, plan, developer);

  // 5. Risk (higher = safer)
  let risk = 100;
  if (listing.readyState === "Off-Plan") risk -= 12;
  risk -= (developer?.deliveryRiskScore ?? 25) * 0.3;
  if ((area?.liquidityScore ?? 70) < 70) risk -= (70 - (area?.liquidityScore ?? 70)) * 0.4;
  if (listing.status === "stale") risk -= 10;
  if (valueGapPercent != null && valueGapPercent < -30) risk -= 8; // "too good to be true"
  if ((listing.serviceChargePsf ?? 0) > 25) risk -= 6;
  if (rent.demandScore < 55) risk -= (55 - rent.demandScore) * 0.3;
  if (plan && (plan.postHandoverPercent ?? 0) >= 50) risk -= 6; // very aggressive deferral
  if (listing.sizeSqft == null) risk -= 15;
  if (rent.confidence < 0.4) risk -= 8;
  if ((area?.vacancyRiskScore ?? 25) > 30) risk -= ((area!.vacancyRiskScore! - 30) * 0.25);
  const riskScore = clamp(risk, 0, 100);

  // 6. Confidence (0..1 → 0..100)
  const fieldCompleteness = completeness(listing.fieldProvenance, KEY_FIELDS);
  const sourceReliability = SOURCE_RELIABILITY[listing.sourceClass] ?? 0.6;
  let conf01 = 0.38 * fv.confidence + 0.27 * rent.confidence + 0.15 * fieldCompleteness + 0.2 * sourceReliability;
  if (listing.isDuplicate) conf01 -= 0.08;
  if (listing.status === "stale") conf01 -= 0.08;
  conf01 = clamp(conf01, 0, 1);
  const confidenceScore = Math.round(conf01 * 100);

  // 7. Missing-data penalty (points off the final total)
  let missingDataPenalty = 0;
  if (listing.sizeSqft == null) missingDataPenalty += 18;
  if (rent.annualRentAed == null) missingDataPenalty += 10;
  if (fv.compCount === 0) missingDataPenalty += 12;
  if (y.serviceChargeAssumed) missingDataPenalty += 3;

  const breakdown: ScoreBreakdown = {
    priceScore: Math.round(priceScore),
    yieldScore: Math.round(yieldScore),
    rentDemandScore: Math.round(rentDemandScore),
    liquidityScore: Math.round(liquidityScore),
    areaMomentumScore: Math.round(areaMomentumScore),
    developerScore: Math.round(developerScore),
    paymentPlanScore: Math.round(paymentPlanScore),
    riskScore: Math.round(riskScore),
    confidenceScore,
    missingDataPenalty,
  };

  const totalDealScore = Math.round(computeTotal(breakdown, weights));
  const riskLabel = riskLabelFromScore(riskScore);

  const explanation = buildExplanation({
    listing,
    valueGapPercent,
    netYield: y.netYieldPct,
    grossYield: y.grossYieldPct,
    fv,
    rent,
    breakdown,
    developer,
    area,
    serviceChargeAssumed: y.serviceChargeAssumed,
  });

  return {
    listingId: listing.id,
    estimatedMarketValueAed: fv.estimatedValueAed,
    estimatedMarketValueLow: fv.estimatedValueLow,
    estimatedMarketValueHigh: fv.estimatedValueHigh,
    estimatedAnnualRentAed: rent.annualRentAed,
    estimatedAnnualRentLow: rent.annualRentLow,
    estimatedAnnualRentHigh: rent.annualRentHigh,
    estimatedGrossYield: y.grossYieldPct,
    estimatedNetYield: y.netYieldPct,
    valueGapPercent,
    totalDealScore,
    breakdown,
    riskLabel,
    overallConfidence: conf01,
    compCount: fv.compCount,
    rentCompCount: rent.compCount,
    explanation,
    calculatedAt: now.toISOString(),
  };
}

function buildExplanation(x: {
  listing: Listing;
  valueGapPercent: number | null;
  netYield: number | null;
  grossYield: number | null;
  fv: ReturnType<typeof estimateFairValue>;
  rent: ReturnType<typeof estimateRent>;
  breakdown: ScoreBreakdown;
  developer?: Developer;
  area?: Area;
  serviceChargeAssumed: boolean;
}): string[] {
  const out: string[] = [];
  if (x.valueGapPercent != null) {
    if (x.valueGapPercent <= -5)
      out.push(`Asking is ${Math.abs(x.valueGapPercent).toFixed(1)}% BELOW the comp-based fair value — a discount (${x.fv.compCount} comps, building/area weighted).`);
    else if (x.valueGapPercent >= 5)
      out.push(`Asking is ${x.valueGapPercent.toFixed(1)}% ABOVE the comp-based fair value — a premium (${x.fv.compCount} comps).`);
    else out.push(`Asking is in line with comp-based fair value (${x.fv.compCount} comps).`);
  } else {
    out.push("Fair value could not be estimated (insufficient comparable transactions or unknown size).");
  }
  if (x.netYield != null) out.push(`Estimated net yield ≈ ${x.netYield.toFixed(1)}% (gross ≈ ${x.grossYield?.toFixed(1)}%), from ${x.rent.compCount} rent comps.`);
  else out.push("Yield could not be estimated (no supportable rent or unknown size).");
  if (x.area) out.push(`${x.area.name}: liquidity ${x.area.liquidityScore ?? "—"}/100, price momentum ${x.area.annualPriceChangePct ?? "—"}%/yr.`);
  if (x.developer) out.push(`Developer ${x.developer.name}: quality ${x.developer.qualityScore}/100, delivery risk ${x.developer.deliveryRiskScore}/100.`);
  if (x.listing.readyState === "Off-Plan") out.push("Off-plan: delivery/completion risk applied; payment-plan attractiveness considered.");
  if (x.serviceChargeAssumed) out.push("⚠ Service charge was assumed (not provided by source) — net yield is approximate.");
  if (x.breakdown.missingDataPenalty > 0) out.push(`Missing-data penalty: −${x.breakdown.missingDataPenalty} pts (see Data Quality).`);
  return out;
}

/** Convenience: score a listing and attach display relations + plan. */
export function buildScoredListing(listing: Listing, ctx: ScoringContext): ScoredListing {
  const score = scoreListing(listing, ctx);
  return {
    ...listing,
    score,
    developerName: listing.developerId ? ctx.developerById.get(listing.developerId)?.name : undefined,
    projectName: listing.projectId ? ctx.projectById.get(listing.projectId)?.name : undefined,
    areaName: ctx.areaById.get(listing.areaId)?.name,
    paymentPlan: ctx.paymentPlanByListing.get(listing.id),
  };
}
