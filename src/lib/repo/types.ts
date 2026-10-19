import type {
  Alert,
  Area,
  Comp,
  DataSource,
  Developer,
  ListingScore,
  MarketSeriesPoint,
  PortfolioAsset,
  Project,
  Recommendation,
  ScoredListing,
  ScoringWeights,
  Watchlist,
} from "@/types/domain";

export interface ListingQuery {
  q?: string;
  emirate?: string;
  areaId?: string;
  developerId?: string;
  projectId?: string;
  propertyType?: string;
  readyState?: string;
  tenure?: string;
  furnishing?: string;
  occupancy?: string;
  source?: string;
  status?: string;
  bedrooms?: number; // exact / min
  minPrice?: number;
  maxPrice?: number;
  minPsf?: number;
  maxPsf?: number;
  minSize?: number;
  maxSize?: number;
  minNetYield?: number;
  maxDownPaymentPct?: number;
  minDealScore?: number;
  minConfidence?: number;
  riskLabel?: string;
  hasPaymentPlan?: boolean;
  hideLowQuality?: boolean;
  hideDuplicates?: boolean;
  sortBy?: string; // dealScore | netYield | price | psf | valueGap | listed | confidence
  sortDir?: "asc" | "desc";
  limit?: number;
  offset?: number;
}

export interface ListingsResult {
  items: ScoredListing[];
  total: number;
  facets?: Record<string, { value: string; count: number }[]>;
}

export interface AreaDetail {
  area: Area;
  listings: ScoredListing[];
  priceSeries: MarketSeriesPoint[];
  rentSeries: MarketSeriesPoint[];
  developerMix: { developerId: string; name: string; count: number }[];
  buildings: { name: string; medianPsf: number; count: number; vsAreaPct: number }[];
  txnVolume12m: number;
}

export interface DeveloperDetail {
  developer: Developer;
  projects: Project[];
  listings: ScoredListing[];
  projectStats: { projectId: string; name: string; avgPsf: number | null; listings: number }[];
  bestDeals: ScoredListing[];
  weakestDeals: ScoredListing[];
}

export interface ProjectDetail {
  project: Project;
  developer?: Developer;
  area?: Area;
  listings: ScoredListing[];
  priceSeries: MarketSeriesPoint[];
}

export interface PortfolioSummary {
  totalValue: number;
  equity: number;
  debt: number;
  ltv: number;
  annualRent: number;
  noi: number;
  grossYield: number;
  netYield: number;
  cashOnCash: number;
  unrealizedGain: number;
  realizedGain: number;
  irr: number | null;
  dscr: number | null;
  vacancyExposurePct: number;
  geographicConcentration: { key: string; pct: number }[];
  developerConcentration: { key: string; pct: number }[];
  offPlanExposurePct: number;
  readyExposurePct: number;
  riskScore: number;
  recommendedActions: { assetId?: string; severity: string; title: string; detail: string }[];
  rentRenewals: { assetId: string; assetName: string; leaseEnd: string; monthsToEnd: number }[];
}

export interface Repository {
  backend: "memory" | "postgres";
  getListings(query: ListingQuery): Promise<ListingsResult>;
  getListing(id: string): Promise<ScoredListing | null>;
  getListingComps(id: string): Promise<Comp[]>;
  getListingScore(id: string): Promise<ListingScore | null>;
  getRecommendations(input: { profileId?: string; weights?: ScoringWeights; filters?: ListingQuery; limit?: number }): Promise<Recommendation[]>;
  getAreas(): Promise<Area[]>;
  getAreaDetail(id: string): Promise<AreaDetail | null>;
  getDevelopers(): Promise<Developer[]>;
  getDeveloperDetail(id: string): Promise<DeveloperDetail | null>;
  getProjects(): Promise<Project[]>;
  getProjectDetail(id: string): Promise<ProjectDetail | null>;
  getPortfolio(userId: string): Promise<{ assets: PortfolioAsset[]; summary: PortfolioSummary }>;
  addPortfolioAsset(userId: string, asset: Partial<PortfolioAsset>): Promise<PortfolioAsset>;
  updatePortfolioAsset(id: string, patch: Partial<PortfolioAsset>): Promise<PortfolioAsset | null>;
  deletePortfolioAsset(id: string): Promise<boolean>;
  getWatchlists(userId: string): Promise<Watchlist[]>;
  getAlerts(userId: string): Promise<Alert[]>;
  getSourceHealth(): Promise<DataSource[]>;
  isSampleData: boolean;
}
