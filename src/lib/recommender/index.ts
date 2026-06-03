import type { RecommendationProfile, Recommendation, RiskLabel, ScoredListing } from "@/types/domain";
import { computeTotal } from "@/lib/scoring";
import { fmtPct } from "@/lib/utils";

export * from "./profiles";

const RISK_ORDER: Record<RiskLabel, number> = { Low: 0, Moderate: 1, Elevated: 2, High: 3 };

/** Effective down-payment %: off-plan uses its plan; ready uses a mortgage assumption. */
export function effectiveDownPaymentPct(l: ScoredListing): number {
  if (l.paymentPlan?.downPaymentPercent != null) return l.paymentPlan.downPaymentPercent;
  return l.readyState === "Off-Plan" ? 20 : 20; // 20% resident mortgage assumption for ready
}

function passesFilters(l: ScoredListing, p: RecommendationProfile): { ok: boolean; matched: string[] } {
  const f = p.filters ?? {};
  const matched: string[] = [];
  if (f.emirate) {
    if (l.emirate !== f.emirate) return { ok: false, matched };
    matched.push(`Emirate = ${f.emirate}`);
  }
  if (f.maxBudget != null) {
    if ((l.askingPriceAed ?? Infinity) > f.maxBudget) return { ok: false, matched };
    matched.push(`Within budget`);
  }
  if (f.minNetYield != null) {
    if ((l.score.estimatedNetYield ?? -1) < f.minNetYield) return { ok: false, matched };
    matched.push(`Net yield ≥ ${f.minNetYield}%`);
  }
  if (f.maxDownPaymentPct != null) {
    if (effectiveDownPaymentPct(l) > f.maxDownPaymentPct) return { ok: false, matched };
    matched.push(`Down payment ≤ ${f.maxDownPaymentPct}%`);
  }
  if (f.readyState) {
    if (l.readyState !== f.readyState) return { ok: false, matched };
    matched.push(f.readyState);
  }
  if (f.minConfidence != null) {
    if (l.score.overallConfidence < f.minConfidence) return { ok: false, matched };
    matched.push(`Confidence ≥ ${Math.round(f.minConfidence * 100)}%`);
  }
  if (f.riskTolerance) {
    if (RISK_ORDER[l.score.riskLabel] > RISK_ORDER[f.riskTolerance]) return { ok: false, matched };
    matched.push(`Risk ≤ ${f.riskTolerance}`);
  }
  return { ok: true, matched };
}

function listMissingData(l: ScoredListing): string[] {
  const out: string[] = [];
  const fp = l.fieldProvenance ?? {};
  if (l.sizeSqft == null) out.push("Unit size not provided by source");
  if (l.score.estimatedAnnualRentAed == null) out.push("No supportable rent estimate");
  if (l.score.compCount === 0) out.push("No comparable transactions found");
  if (fp.serviceChargePsf?.sourceClass === "unavailable") out.push("Service charge unavailable (assumed)");
  if (fp.occupancyStatus?.sourceClass === "unavailable") out.push("Occupancy status unknown");
  return out;
}

function listRisks(l: ScoredListing): string[] {
  const out: string[] = [];
  if (l.score.riskLabel === "High" || l.score.riskLabel === "Elevated") out.push(`${l.score.riskLabel} overall risk`);
  if (l.readyState === "Off-Plan") out.push("Off-plan delivery/completion risk");
  if (l.status === "stale") out.push("Stale listing (long days-on-market)");
  if (l.isDuplicate) out.push("Possible duplicate of another listing");
  if (l.score.valueGapPercent != null && l.score.valueGapPercent < -30) out.push("Discount looks unusually deep — verify before acting");
  if ((l.serviceChargePsf ?? 0) > 25) out.push("High service charge");
  return out;
}

function buildReasons(l: ScoredListing, matchedFilters: string[]): string[] {
  const reasons: string[] = [];
  const g = l.score.valueGapPercent;
  if (g != null && g <= -5) reasons.push(`Trading ${Math.abs(g).toFixed(1)}% below comp-based fair value`);
  if (l.score.estimatedNetYield != null && l.score.estimatedNetYield >= 6) reasons.push(`Strong net yield ${fmtPct(l.score.estimatedNetYield)}`);
  if (l.score.breakdown.areaMomentumScore >= 75) reasons.push(`High area momentum (${l.areaName})`);
  if (l.score.breakdown.developerScore >= 85) reasons.push(`Top-tier developer (${l.developerName})`);
  if (l.score.breakdown.paymentPlanScore >= 70 && l.paymentPlan) reasons.push(`Attractive payment plan (${l.paymentPlan.planName})`);
  if (l.score.breakdown.liquidityScore >= 80) reasons.push("High liquidity area");
  reasons.push(...matchedFilters.filter((m) => !["Ready", "Off-Plan"].includes(m)).map((m) => `Matches preference: ${m}`));
  if (reasons.length === 0) reasons.push(`Overall deal score ${l.score.totalDealScore}/100 under this profile`);
  return reasons.slice(0, 6);
}

export interface RankOptions {
  /** When true, drop listings that fail the profile's hard filters. */
  applyFilters?: boolean;
  /** Exclude duplicates / removed listings. */
  excludeDuplicates?: boolean;
  limit?: number;
}

export function rankRecommendations(listings: ScoredListing[], profile: RecommendationProfile, opts: RankOptions = {}): Recommendation[] {
  const { applyFilters = true, excludeDuplicates = true, limit } = opts;
  const recs: Recommendation[] = [];
  for (const l of listings) {
    if (excludeDuplicates && (l.isDuplicate || l.status === "removed")) continue;
    const { ok, matched } = passesFilters(l, profile);
    if (applyFilters && !ok) continue;
    const fitScore = Math.round(computeTotal(l.score.breakdown, profile.weights));
    recs.push({
      listing: l,
      reasons: buildReasons(l, matched),
      matchedPreferences: matched,
      majorRisks: listRisks(l),
      missingData: listMissingData(l),
      confidence: l.score.overallConfidence,
      fitScore,
    });
  }
  recs.sort((a, b) => b.fitScore - a.fitScore || b.listing.score.totalDealScore - a.listing.score.totalDealScore);
  return limit ? recs.slice(0, limit) : recs;
}

// ── Similarity sets for the Home tab + Deal Detail "alternatives" ────────────

const netY = (l: ScoredListing) => l.score.estimatedNetYield ?? -1;
const gap = (l: ScoredListing) => l.score.valueGapPercent ?? 0;

export interface SimilaritySets {
  similarByPrice: ScoredListing[];
  higherYield: ScoredListing[];
  betterValue: ScoredListing[];
  safer: ScoredListing[];
  higherUpside: ScoredListing[];
  sameArea: ScoredListing[];
  sameDeveloper: ScoredListing[];
  betterPaymentTerms: ScoredListing[];
  betterLiquidity: ScoredListing[];
}

export function similaritySets(target: ScoredListing, pool: ScoredListing[], n = 5): SimilaritySets {
  const others = pool.filter((l) => l.id !== target.id && !l.isDuplicate && l.status !== "removed");
  const sameType = others.filter((l) => l.propertyType === target.propertyType);
  const price = target.askingPriceAed ?? 0;
  const tNet = netY(target);
  const tGap = gap(target);
  const tRisk = target.score.breakdown.riskScore;
  const tMomentum = target.score.breakdown.areaMomentumScore;
  const tLiquidity = target.score.breakdown.liquidityScore;
  const tDown = effectiveDownPaymentPct(target);

  const within = (l: ScoredListing, pct: number) => price > 0 && Math.abs((l.askingPriceAed ?? 0) - price) / price <= pct;

  return {
    similarByPrice: sameType.filter((l) => within(l, 0.15)).sort((a, b) => Math.abs((a.askingPriceAed ?? 0) - price) - Math.abs((b.askingPriceAed ?? 0) - price)).slice(0, n),
    higherYield: others.filter((l) => netY(l) > tNet).sort((a, b) => netY(b) - netY(a)).slice(0, n),
    betterValue: others.filter((l) => gap(l) < tGap).sort((a, b) => gap(a) - gap(b)).slice(0, n),
    safer: others.filter((l) => l.score.breakdown.riskScore > tRisk).sort((a, b) => b.score.breakdown.riskScore - a.score.breakdown.riskScore).slice(0, n),
    higherUpside: others.filter((l) => l.score.breakdown.areaMomentumScore > tMomentum).sort((a, b) => b.score.breakdown.areaMomentumScore - a.score.breakdown.areaMomentumScore).slice(0, n),
    sameArea: others.filter((l) => l.areaId === target.areaId).sort((a, b) => b.score.totalDealScore - a.score.totalDealScore).slice(0, n),
    sameDeveloper: target.developerId ? others.filter((l) => l.developerId === target.developerId).sort((a, b) => b.score.totalDealScore - a.score.totalDealScore).slice(0, n) : [],
    betterPaymentTerms: others.filter((l) => effectiveDownPaymentPct(l) < tDown).sort((a, b) => effectiveDownPaymentPct(a) - effectiveDownPaymentPct(b)).slice(0, n),
    betterLiquidity: others.filter((l) => l.score.breakdown.liquidityScore > tLiquidity).sort((a, b) => b.score.breakdown.liquidityScore - a.score.breakdown.liquidityScore).slice(0, n),
  };
}
