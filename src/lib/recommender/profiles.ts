import type { RecommendationProfile } from "@/types/domain";

/** Preset investor profiles. Weights are re-normalized to 100 at scoring time. */
export const PRESET_PROFILES: RecommendationProfile[] = [
  {
    id: "high-yield",
    name: "High Yield Investor",
    description: "Maximize net rental yield and tenant demand; appreciation is secondary.",
    isPreset: true,
    weights: { priceDiscount: 18, netYield: 32, rentDemand: 14, liquidity: 10, areaMomentum: 4, developerQuality: 6, paymentPlan: 4, risk: 6, dataConfidence: 6 },
    filters: { minNetYield: 6 },
  },
  {
    id: "capital-appreciation",
    name: "Capital Appreciation Investor",
    description: "Favor strong area momentum and quality developers for capital growth.",
    isPreset: true,
    weights: { priceDiscount: 18, netYield: 8, rentDemand: 6, liquidity: 8, areaMomentum: 28, developerQuality: 18, paymentPlan: 4, risk: 4, dataConfidence: 6 },
  },
  {
    id: "conservative-income",
    name: "Conservative Income Investor",
    description: "Stable income from ready, liquid, low-risk assets with solid data confidence.",
    isPreset: true,
    weights: { priceDiscount: 15, netYield: 22, rentDemand: 12, liquidity: 14, areaMomentum: 6, developerQuality: 10, paymentPlan: 2, risk: 12, dataConfidence: 7 },
    filters: { readyState: "Ready", riskTolerance: "Moderate", minConfidence: 0.45 },
  },
  {
    id: "offplan-payment-plan",
    name: "Off-Plan Payment Plan Investor",
    description: "Attractive payment plans from credible developers with growth upside.",
    isPreset: true,
    weights: { priceDiscount: 12, netYield: 8, rentDemand: 6, liquidity: 6, areaMomentum: 16, developerQuality: 16, paymentPlan: 24, risk: 6, dataConfidence: 6 },
    filters: { readyState: "Off-Plan" },
  },
  {
    id: "family-office",
    name: "Family Office Long Hold",
    description: "Prime, liquid, blue-chip developer assets for multi-year holds.",
    isPreset: true,
    weights: { priceDiscount: 14, netYield: 12, rentDemand: 8, liquidity: 16, areaMomentum: 14, developerQuality: 18, paymentPlan: 2, risk: 8, dataConfidence: 8 },
  },
  {
    id: "flip-resale",
    name: "Flip / Resale Opportunity",
    description: "Deep discounts to fair value in liquid, rising areas for a near-term exit.",
    isPreset: true,
    weights: { priceDiscount: 34, netYield: 8, rentDemand: 6, liquidity: 14, areaMomentum: 18, developerQuality: 8, paymentPlan: 4, risk: 4, dataConfidence: 4 },
  },
  {
    id: "low-down-payment",
    name: "Low Down Payment Buyer",
    description: "Minimize upfront cash via low-deposit / post-handover payment plans.",
    isPreset: true,
    weights: { priceDiscount: 16, netYield: 10, rentDemand: 8, liquidity: 6, areaMomentum: 12, developerQuality: 12, paymentPlan: 28, risk: 4, dataConfidence: 4 },
    filters: { maxDownPaymentPct: 20 },
  },
  {
    id: "tenant-ready-cashflow",
    name: "Tenant-Ready Cashflow Buyer",
    description: "Ready, tenant-ready units producing immediate, well-supported cashflow.",
    isPreset: true,
    weights: { priceDiscount: 16, netYield: 26, rentDemand: 18, liquidity: 10, areaMomentum: 4, developerQuality: 6, paymentPlan: 2, risk: 8, dataConfidence: 10 },
    filters: { readyState: "Ready" },
  },
];

export const PROFILE_BY_ID = new Map(PRESET_PROFILES.map((p) => [p.id, p]));
export const DEFAULT_PROFILE = PRESET_PROFILES[0];
