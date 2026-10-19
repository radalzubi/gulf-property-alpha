import type { FieldProvenance, SourceClass } from "@/lib/provenance";

export type Emirate = "Dubai" | "Abu Dhabi" | "Sharjah" | "Ras Al Khaimah" | "Riyadh" | "Jeddah" | "Doha";

export const ACTIVE_EMIRATES: Emirate[] = ["Dubai", "Abu Dhabi"];

export type PropertyType = "Apartment" | "Villa" | "Townhouse" | "Penthouse" | "Plot" | "Office" | "Retail";
export type ListingType = "Sale" | "Rent";
export type ReadyState = "Ready" | "Off-Plan";
export type Tenure = "Freehold" | "Leasehold" | "Unknown";
export type FurnishingStatus = "Furnished" | "Semi-Furnished" | "Unfurnished" | "Unknown";
export type OccupancyStatus = "Vacant" | "Tenanted" | "Owner-Occupied" | "Unknown";
export type ListingStatus = "active" | "stale" | "removed" | "duplicate";

export type RiskLabel = "Low" | "Moderate" | "Elevated" | "High";

/** Source/connector record (also drives Data Quality / Source Health tab). */
export type SourceType =
  | "official"
  | "portal"
  | "broker"
  | "developer"
  | "user"
  | "inferred";

export interface DataSource {
  id: string;
  name: string;
  sourceType: SourceType;
  sourceClass: SourceClass;
  isOfficial: boolean;
  identifier?: string;
  refreshFrequencyMinutes: number | null;
  status: "ok" | "degraded" | "failing" | "not_configured" | "disabled";
  lastSuccessAt?: string;
  lastFailureAt?: string;
  notes?: string;
  setupInstructions?: string;
  // rolling health stats (from ingestion_jobs)
  recordsPulled?: number;
  recordsChanged?: number;
  recordsRejected?: number;
  duplicateRate?: number;
  matchRate?: number;
  missingFieldRate?: number;
  staleListingCount?: number;
  apiLatencyMs?: number;
  rateLimitRemaining?: number | null;
  confidenceContribution?: number;
}

export interface Area {
  id: string;
  name: string;
  emirate: Emirate;
  masterCommunity?: string;
  lat: number;
  lng: number;
  // area-level market stats (model/aggregate derived; provenance recorded)
  medianSalePsf?: number;
  medianRentPsf?: number;
  medianSalePrice?: number;
  grossYield?: number;
  netYield?: number;
  annualPriceChangePct?: number;
  annualRentChangePct?: number;
  liquidityScore?: number; // 0..100
  vacancyRiskScore?: number; // 0..100 (higher = riskier)
  tenantDemandScore?: number; // 0..100
  supplyPipelineUnits?: number;
  offPlanSharePct?: number;
  txnVolume12m?: number;
  thesis?: string;
  risks?: string[];
  isSample: boolean;
  fieldProvenance?: FieldProvenance;
}

export interface Developer {
  id: string;
  name: string;
  officialId?: string;
  emirate: Emirate;
  registrationStatus?: string;
  website?: string;
  phone?: string;
  email?: string;
  completedProjects?: number;
  activeProjects?: number;
  deliveredUnits?: number;
  avgDelayMonths?: number | null;
  avgResalePremiumPct?: number | null;
  qualityScore?: number; // 0..100
  deliveryRiskScore?: number; // 0..100 (higher = riskier)
  serviceChargeRiskScore?: number; // 0..100
  notes?: string;
  isSample: boolean;
  fieldProvenance?: FieldProvenance;
  confidenceScore?: number;
}

export interface Project {
  id: string;
  developerId: string;
  name: string;
  emirate: Emirate;
  areaId: string;
  status: "Announced" | "Under Construction" | "Completed" | "Handover" | "Unknown";
  launchDate?: string;
  handoverDate?: string;
  projectType?: PropertyType;
  officialProjectId?: string;
  lat?: number;
  lng?: number;
  isSample: boolean;
  fieldProvenance?: FieldProvenance;
  confidenceScore?: number;
}

export interface PaymentInstallment {
  label: string;
  /** Months from booking (negative/0 = at booking, handover = ~constructionMonths). */
  monthOffset: number;
  percent: number;
  milestone?: "booking" | "construction" | "handover" | "post_handover";
}

export interface PaymentPlan {
  id: string;
  listingId: string;
  planName?: string;
  downPaymentPercent?: number;
  bookingAmount?: number;
  duringConstructionPercent?: number;
  onHandoverPercent?: number;
  postHandoverPercent?: number;
  numberOfInstallments?: number;
  /** Months from booking to handover (used to lay out the timeline). */
  handoverMonths?: number;
  rawText?: string;
  schedule: PaymentInstallment[];
  confidenceScore?: number;
  sourceClass: SourceClass;
}

export type ReasonForSaleCategory =
  | "explicitly_stated_urgent"
  | "investor_exit"
  | "tenant_occupied_sale"
  | "vacant_unit"
  | "handover_resale"
  | "distress_motivated"
  | "price_reduction_pattern"
  | "unknown";

export interface ReasonForSale {
  category: ReasonForSaleCategory;
  /** high ONLY if explicitly stated; medium if multiple indirect signals; low if weak; unknown otherwise. */
  confidence: "high" | "medium" | "low" | "unknown";
  sourceClass: SourceClass;
  evidence: string[];
  explanation: string;
}

export interface Listing {
  id: string;
  sourceId: string;
  sourceClass: SourceClass;
  externalListingId?: string;
  canonicalPropertyId?: string;
  title: string;
  description?: string;
  emirate: Emirate;
  areaId: string;
  neighborhood?: string;
  masterCommunity?: string;
  buildingName?: string;
  projectId?: string;
  developerId?: string;
  propertyType: PropertyType;
  listingType: ListingType;
  readyState: ReadyState;
  tenure: Tenure;
  bedrooms: number | null;
  bathrooms: number | null;
  sizeSqft: number | null;
  askingPriceAed: number | null;
  pricePerSqft: number | null;
  furnishingStatus: FurnishingStatus;
  occupancyStatus: OccupancyStatus;
  serviceChargePsf?: number | null;
  handoverDate?: string;
  lat?: number;
  lng?: number;
  addressText?: string;
  listingUrl?: string;
  imageUrls: string[];
  agentName?: string;
  agencyName?: string;
  publicPhone?: string;
  publicEmail?: string;
  whatsapp?: string;
  listedAt?: string;
  firstSeenAt: string;
  lastSeenAt: string;
  lastRefreshedAt: string;
  status: ListingStatus;
  isDuplicate: boolean;
  duplicateClusterId?: string;
  priceHistory?: { date: string; price: number }[];
  reasonForSale?: ReasonForSale;
  hasPaymentPlan: boolean;
  isSample: boolean;
  fieldProvenance: FieldProvenance;
  dataQualityScore?: number; // 0..100
}

export interface GovTransaction {
  id: string;
  sourceId: string;
  emirate: Emirate;
  transactionDate: string;
  areaId: string;
  projectName?: string;
  buildingName?: string;
  propertyType: PropertyType;
  transactionType: "Sale" | "Mortgage" | "Gift";
  readyState: ReadyState;
  priceAed: number;
  sizeSqft: number;
  pricePerSqft: number;
  bedrooms: number | null;
  officialReference?: string;
  isSample: boolean;
}

export interface GovRent {
  id: string;
  sourceId: string;
  emirate: Emirate;
  rentDate: string;
  areaId: string;
  projectName?: string;
  buildingName?: string;
  propertyType: PropertyType;
  annualRentAed: number;
  sizeSqft: number;
  rentPerSqft: number;
  bedrooms: number | null;
  contractType: "New" | "Renewal";
  isSample: boolean;
}

export interface MarketSeriesPoint {
  id: string;
  emirate: Emirate;
  areaId?: string;
  buildingOrProject?: string;
  metricName: "median_sale_psf" | "median_rent_psf" | "txn_volume" | "gross_yield" | "rent_index";
  periodStart: string;
  periodEnd: string;
  value: number;
  sampleSize?: number;
  sourceId: string;
  confidenceScore?: number;
}

export interface Comp {
  compTransactionId: string;
  compType: "same_building" | "same_project" | "same_area" | "neighborhood";
  pricePerSqft: number;
  priceAed: number;
  sizeSqft: number;
  bedrooms: number | null;
  transactionDate: string;
  distanceKm?: number;
  sameBedrooms: boolean;
  recencyDays: number;
  similarityScore: number; // 0..1
  weight: number;
}

export interface ScoreBreakdown {
  priceScore: number;
  yieldScore: number;
  rentDemandScore: number;
  liquidityScore: number;
  areaMomentumScore: number;
  developerScore: number;
  paymentPlanScore: number;
  riskScore: number; // 0..100, higher = safer here (risk-adjusted contribution)
  confidenceScore: number; // 0..100
  missingDataPenalty: number; // points subtracted
}

export interface ListingScore {
  listingId: string;
  estimatedMarketValueAed: number | null;
  estimatedMarketValueLow?: number | null;
  estimatedMarketValueHigh?: number | null;
  estimatedAnnualRentAed: number | null;
  estimatedAnnualRentLow?: number | null;
  estimatedAnnualRentHigh?: number | null;
  estimatedGrossYield: number | null;
  estimatedNetYield: number | null;
  valueGapPercent: number | null; // negative = discount (good), positive = premium
  totalDealScore: number; // 0..100
  breakdown: ScoreBreakdown;
  riskLabel: RiskLabel;
  overallConfidence: number; // 0..1
  compCount: number;
  rentCompCount: number;
  explanation: string[];
  calculatedAt: string;
}

/** A listing joined with its score + lightweight relations, for the UI/API. */
export interface ScoredListing extends Listing {
  score: ListingScore;
  developerName?: string;
  projectName?: string;
  areaName?: string;
  paymentPlan?: PaymentPlan;
}

// ── Portfolio ────────────────────────────────────────────────────────────────

export interface PortfolioAsset {
  id: string;
  userId: string;
  assetName: string;
  listingId?: string;
  status: "Owned" | "Planned" | "Watch" | "Hypothetical" | "Sold" | "Off-Plan";
  emirate: Emirate;
  areaId: string;
  buildingOrProject?: string;
  developerId?: string;
  propertyType: PropertyType;
  sizeSqft: number;
  purchasePriceAed: number;
  acquisitionDate?: string;
  currentEstimatedValueAed: number;
  annualRentAed: number;
  occupancyStatus: OccupancyStatus;
  leaseStart?: string;
  leaseEnd?: string;
  mortgageBalanceAed: number;
  interestRate: number; // annual %, e.g. 4.5
  monthlyPaymentAed: number;
  serviceChargesAed: number;
  maintenanceAed: number;
  managementFeeAed: number;
  insuranceAed: number;
  otherExpensesAed: number;
  soldPriceAed?: number;
  soldDate?: string;
  notes?: string;
  isSample: boolean;
}

export interface PortfolioCashflow {
  id: string;
  assetId: string;
  date: string;
  cashflowType: "rent" | "expense" | "mortgage" | "capex" | "purchase" | "sale";
  amountAed: number; // sign: inflow positive, outflow negative
  description?: string;
}

// ── Watchlists / Alerts ────────────────────────────────────────────────────

export interface Watchlist {
  id: string;
  userId: string;
  name: string;
  criteria?: Record<string, unknown>;
  itemCount: number;
}

export interface WatchlistItem {
  id: string;
  watchlistId: string;
  listingId: string;
  addedAt: string;
  notes?: string;
  status: "watching" | "contacted" | "passed";
}

export type AlertType =
  | "price_drop"
  | "new_match"
  | "underpriced_detected"
  | "yield_above_threshold"
  | "payment_plan_improved"
  | "developer_risk_changed"
  | "area_trend_changed"
  | "rent_trend_changed"
  | "watched_removed"
  | "watched_duplicated"
  | "watched_stale"
  | "comp_supports_gap"
  | "portfolio_rent_renewal"
  | "portfolio_payment_due"
  | "portfolio_concentration";

export interface Alert {
  id: string;
  userId: string;
  alertType: AlertType;
  listingId?: string;
  assetId?: string;
  severity: "info" | "opportunity" | "warning" | "critical";
  title: string;
  message: string;
  createdAt: string;
  readAt?: string;
}

// ── Recommender ──────────────────────────────────────────────────────────────

export interface ScoringWeights {
  priceDiscount: number;
  netYield: number;
  rentDemand: number;
  liquidity: number;
  areaMomentum: number;
  developerQuality: number;
  paymentPlan: number;
  risk: number;
  dataConfidence: number;
}

export interface RecommendationProfile {
  id: string;
  name: string;
  description: string;
  weights: ScoringWeights;
  filters?: {
    emirate?: Emirate;
    maxBudget?: number;
    minNetYield?: number;
    maxDownPaymentPct?: number;
    readyState?: ReadyState;
    minConfidence?: number;
    riskTolerance?: RiskLabel;
  };
  isPreset: boolean;
}

export interface Recommendation {
  listing: ScoredListing;
  reasons: string[];
  matchedPreferences: string[];
  majorRisks: string[];
  missingData: string[];
  confidence: number;
  fitScore: number; // profile-weighted, 0..100
}
