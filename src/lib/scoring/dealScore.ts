import type { RiskLabel, ScoreBreakdown, ScoringWeights } from "@/types/domain";
import { clamp } from "@/lib/utils";

/** Default scoring weights (sum = 100). User-editable via the UI sliders. */
export const DEFAULT_WEIGHTS: ScoringWeights = {
  priceDiscount: 25,
  netYield: 20,
  rentDemand: 10,
  liquidity: 10,
  areaMomentum: 10,
  developerQuality: 10,
  paymentPlan: 5,
  risk: 5,
  dataConfidence: 5,
};

export function normalizeWeights(w: ScoringWeights): ScoringWeights {
  const sum =
    w.priceDiscount + w.netYield + w.rentDemand + w.liquidity + w.areaMomentum + w.developerQuality + w.paymentPlan + w.risk + w.dataConfidence;
  if (sum <= 0) return DEFAULT_WEIGHTS;
  const f = 100 / sum;
  return {
    priceDiscount: w.priceDiscount * f,
    netYield: w.netYield * f,
    rentDemand: w.rentDemand * f,
    liquidity: w.liquidity * f,
    areaMomentum: w.areaMomentum * f,
    developerQuality: w.developerQuality * f,
    paymentPlan: w.paymentPlan * f,
    risk: w.risk * f,
    dataConfidence: w.dataConfidence * f,
  };
}

// ── Sub-signal mappers (each returns 0..100) ─────────────────────────────────

/** valueGapPct: negative = discount to fair value (good). */
export const scoreFromDiscount = (valueGapPct: number | null) =>
  valueGapPct == null ? 50 : clamp(55 - valueGapPct * 2.0, 0, 100);

export const scoreFromNetYield = (netYieldPct: number | null) =>
  netYieldPct == null ? 35 : clamp((netYieldPct - 2) * 16, 0, 100);

export const scoreFromMomentum = (annualPriceChangePct?: number, annualRentChangePct?: number) => {
  const p = annualPriceChangePct ?? 6;
  const r = annualRentChangePct ?? 6;
  return clamp(35 + ((p + r) / 2) * 4, 0, 100);
};

export const scoreFromLiquidity = (areaLiquidity?: number, txnVolume?: number) =>
  clamp((areaLiquidity ?? 55) * 0.8 + Math.min(22, txnVolume ?? 0), 0, 100);

export function computeTotal(breakdown: ScoreBreakdown, weights: ScoringWeights): number {
  const w = normalizeWeights(weights);
  const weighted =
    (breakdown.priceScore * w.priceDiscount +
      breakdown.yieldScore * w.netYield +
      breakdown.rentDemandScore * w.rentDemand +
      breakdown.liquidityScore * w.liquidity +
      breakdown.areaMomentumScore * w.areaMomentum +
      breakdown.developerScore * w.developerQuality +
      breakdown.paymentPlanScore * w.paymentPlan +
      breakdown.riskScore * w.risk +
      breakdown.confidenceScore * w.dataConfidence) /
    100;
  return clamp(weighted - breakdown.missingDataPenalty, 0, 100);
}

export function riskLabelFromScore(riskScore: number): RiskLabel {
  if (riskScore >= 78) return "Low";
  if (riskScore >= 60) return "Moderate";
  if (riskScore >= 42) return "Elevated";
  return "High";
}

export function dealScoreTone(total: number): "good" | "caution" | "risk" {
  if (total >= 70) return "good";
  if (total >= 50) return "caution";
  return "risk";
}
