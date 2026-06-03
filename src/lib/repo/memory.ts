import type {
  Area,
  Comp,
  Developer,
  GovTransaction,
  ListingScore,
  MarketSeriesPoint,
  PortfolioAsset,
  Project,
  ScoredListing,
  ScoringWeights,
} from "@/types/domain";
import { buildSampleDataset, type SampleDataset } from "@/db/seed";
import { buildScoredListing, estimateFairValue, type ScoringContext } from "@/lib/scoring";
import { rankRecommendations, effectiveDownPaymentPct, PROFILE_BY_ID, DEFAULT_PROFILE } from "@/lib/recommender";
import { computePortfolioSummary } from "@/lib/portfolio";
import { percentile, median } from "@/lib/utils";
import type { AreaDetail, DeveloperDetail, ListingQuery, ListingsResult, ProjectDetail, Repository } from "./types";

/** Optional write-through hooks so a DB backend can persist portfolio mutations. */
export interface PortfolioHooks {
  addAsset?(asset: PortfolioAsset): Promise<void> | void;
  updateAsset?(id: string, patch: Partial<PortfolioAsset>): Promise<void> | void;
  deleteAsset?(id: string): Promise<void> | void;
}

export interface DatasetRepoOptions {
  backend: "memory" | "postgres";
  isSample: boolean;
  hooks?: PortfolioHooks;
}

class DatasetStore {
  ds: SampleDataset;
  areaById: Map<string, Area>;
  developerById: Map<string, Developer>;
  projectById: Map<string, Project>;
  ctx: ScoringContext;
  private scoredCache: ScoredListing[] | null = null;
  private scoredByIdCache: Map<string, ScoredListing> | null = null;
  portfolio: PortfolioAsset[];
  private assetSeq = 1000;

  constructor(ds: SampleDataset) {
    this.ds = ds;
    this.areaById = new Map(ds.areas.map((a) => [a.id, a]));
    this.developerById = new Map(ds.developers.map((d) => [d.id, d]));
    this.projectById = new Map(ds.projects.map((p) => [p.id, p]));
    this.ctx = {
      transactions: ds.transactions,
      rents: ds.rents,
      areaById: this.areaById,
      developerById: this.developerById,
      projectById: this.projectById,
      paymentPlanByListing: new Map(ds.paymentPlans.map((p) => [p.listingId, p])),
    };
    this.portfolio = ds.portfolio.map((a) => ({ ...a }));
  }

  scored(): ScoredListing[] {
    if (!this.scoredCache) {
      this.scoredCache = this.ds.listings.map((l) => buildScoredListing(l, this.ctx));
      this.scoredByIdCache = new Map(this.scoredCache.map((s) => [s.id, s]));
    }
    return this.scoredCache;
  }
  scoredById(id: string): ScoredListing | undefined {
    this.scored();
    return this.scoredByIdCache!.get(id);
  }
  nextAssetId() {
    return `asset-${++this.assetSeq}`;
  }
}

function applyFilter(items: ScoredListing[], q: ListingQuery): ScoredListing[] {
  const text = q.q?.toLowerCase().trim();
  return items.filter((l) => {
    if (q.hideDuplicates && l.isDuplicate) return false;
    if (q.emirate && l.emirate !== q.emirate) return false;
    if (q.areaId && l.areaId !== q.areaId) return false;
    if (q.developerId && l.developerId !== q.developerId) return false;
    if (q.projectId && l.projectId !== q.projectId) return false;
    if (q.propertyType && l.propertyType !== q.propertyType) return false;
    if (q.readyState && l.readyState !== q.readyState) return false;
    if (q.tenure && l.tenure !== q.tenure) return false;
    if (q.furnishing && l.furnishingStatus !== q.furnishing) return false;
    if (q.occupancy && l.occupancyStatus !== q.occupancy) return false;
    if (q.source && l.sourceId !== q.source) return false;
    if (q.status && l.status !== q.status) return false;
    if (q.hasPaymentPlan != null && l.hasPaymentPlan !== q.hasPaymentPlan) return false;
    if (q.bedrooms != null && (l.bedrooms ?? -1) < q.bedrooms) return false;
    if (q.minPrice != null && (l.askingPriceAed ?? 0) < q.minPrice) return false;
    if (q.maxPrice != null && (l.askingPriceAed ?? Infinity) > q.maxPrice) return false;
    if (q.minPsf != null && (l.pricePerSqft ?? 0) < q.minPsf) return false;
    if (q.maxPsf != null && (l.pricePerSqft ?? Infinity) > q.maxPsf) return false;
    if (q.minSize != null && (l.sizeSqft ?? 0) < q.minSize) return false;
    if (q.maxSize != null && (l.sizeSqft ?? Infinity) > q.maxSize) return false;
    if (q.minNetYield != null && (l.score.estimatedNetYield ?? -1) < q.minNetYield) return false;
    if (q.maxDownPaymentPct != null && effectiveDownPaymentPct(l) > q.maxDownPaymentPct) return false;
    if (q.minDealScore != null && l.score.totalDealScore < q.minDealScore) return false;
    if (q.minConfidence != null && l.score.overallConfidence < q.minConfidence) return false;
    if (q.riskLabel && l.score.riskLabel !== q.riskLabel) return false;
    if (q.hideLowQuality && (l.score.overallConfidence < 0.35 || l.status === "stale")) return false;
    if (text) {
      const hay = `${l.title} ${l.buildingName ?? ""} ${l.areaName ?? ""} ${l.developerName ?? ""} ${l.neighborhood ?? ""}`.toLowerCase();
      if (!hay.includes(text)) return false;
    }
    return true;
  });
}

function sortListings(items: ScoredListing[], sortBy = "dealScore", dir: "asc" | "desc" = "desc"): ScoredListing[] {
  const val = (l: ScoredListing): number => {
    switch (sortBy) {
      case "netYield": return l.score.estimatedNetYield ?? -1;
      case "price": return l.askingPriceAed ?? 0;
      case "psf": return l.pricePerSqft ?? 0;
      case "valueGap": return l.score.valueGapPercent ?? 999;
      case "confidence": return l.score.overallConfidence;
      case "listed": return new Date(l.listedAt ?? l.firstSeenAt).getTime();
      default: return l.score.totalDealScore;
    }
  };
  const sorted = [...items].sort((a, b) => val(a) - val(b));
  return dir === "desc" ? sorted.reverse() : sorted;
}

function buildSeries(txns: GovTransaction[], areaId: string, metric: "median_sale_psf"): MarketSeriesPoint[] {
  const byMonth = new Map<string, number[]>();
  for (const t of txns) {
    const d = new Date(t.transactionDate);
    const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
    if (!byMonth.has(key)) byMonth.set(key, []);
    byMonth.get(key)!.push(t.pricePerSqft);
  }
  return [...byMonth.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([key, vals]) => ({
      id: `${areaId}-${metric}-${key}`,
      emirate: txns[0]?.emirate ?? "Dubai",
      areaId,
      metricName: metric,
      periodStart: `${key}-01`,
      periodEnd: `${key}-28`,
      value: Math.round(median(vals) ?? 0),
      sampleSize: vals.length,
      sourceId: "dld_open_data",
      confidenceScore: Math.min(0.9, 0.3 + vals.length / 30),
    }));
}

/**
 * Builds a Repository over an already-loaded dataset. Used by BOTH the in-memory
 * sample backend and the Postgres backend (which loads the dataset from the DB),
 * so all query/scoring/aggregation logic is shared.
 */
export function createDatasetRepository(ds: SampleDataset, opts: DatasetRepoOptions): Repository {
  const store = new DatasetStore(ds);
  const hooks = opts.hooks;

  return {
    backend: opts.backend,
    isSampleData: opts.isSample,

    async getListings(query) {
      const filtered = applyFilter(store.scored(), query);
      const sorted = sortListings(filtered, query.sortBy, query.sortDir);
      const offset = query.offset ?? 0;
      const limit = query.limit ?? sorted.length;
      const facet = (key: (l: ScoredListing) => string | undefined) => {
        const m = new Map<string, number>();
        for (const l of filtered) {
          const v = key(l);
          if (v) m.set(v, (m.get(v) ?? 0) + 1);
        }
        return [...m.entries()].map(([value, count]) => ({ value, count })).sort((a, b) => b.count - a.count);
      };
      const result: ListingsResult = {
        items: sorted.slice(offset, offset + limit),
        total: filtered.length,
        facets: {
          emirate: facet((l) => l.emirate),
          area: facet((l) => l.areaName),
          propertyType: facet((l) => l.propertyType),
          readyState: facet((l) => l.readyState),
          source: facet((l) => l.sourceId),
          riskLabel: facet((l) => l.score.riskLabel),
        },
      };
      return result;
    },

    async getListing(id) {
      return store.scoredById(id) ?? null;
    },

    async getListingScore(id): Promise<ListingScore | null> {
      return store.scoredById(id)?.score ?? null;
    },

    async getListingComps(id): Promise<Comp[]> {
      const l = store.ds.listings.find((x) => x.id === id);
      if (!l) return [];
      const project = l.projectId ? store.projectById.get(l.projectId) : undefined;
      return estimateFairValue(l, store.ctx.transactions, { project }).comps.slice(0, 30);
    },

    async getRecommendations(input) {
      const profile = input.profileId ? PROFILE_BY_ID.get(input.profileId) ?? DEFAULT_PROFILE : DEFAULT_PROFILE;
      const weights: ScoringWeights = input.weights ?? profile.weights;
      const merged = { ...profile, weights, filters: { ...profile.filters } };
      let pool = store.scored();
      if (input.filters) pool = applyFilter(pool, input.filters);
      return rankRecommendations(pool, merged, { applyFilters: true, limit: input.limit });
    },

    async getAreas() {
      return store.ds.areas;
    },

    async getAreaDetail(id): Promise<AreaDetail | null> {
      const area = store.areaById.get(id);
      if (!area) return null;
      const areaTxns = store.ds.transactions.filter((t) => t.areaId === id);
      const listings = store.scored().filter((l) => l.areaId === id && !l.isDuplicate);
      const priceSeries = buildSeries(areaTxns, id, "median_sale_psf");
      const rentByMonth = new Map<string, number[]>();
      for (const r of store.ds.rents.filter((r) => r.areaId === id)) {
        const d = new Date(r.rentDate);
        const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
        if (!rentByMonth.has(key)) rentByMonth.set(key, []);
        rentByMonth.get(key)!.push(r.rentPerSqft);
      }
      const rentSeries: MarketSeriesPoint[] = [...rentByMonth.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([key, vals]) => ({
        id: `${id}-rent-${key}`,
        emirate: area.emirate,
        areaId: id,
        metricName: "median_rent_psf",
        periodStart: `${key}-01`,
        periodEnd: `${key}-28`,
        value: Math.round((median(vals) ?? 0) * 10) / 10,
        sampleSize: vals.length,
        sourceId: "dld_open_data",
      }));

      const devMap = new Map<string, number>();
      for (const l of listings) if (l.developerId) devMap.set(l.developerId, (devMap.get(l.developerId) ?? 0) + 1);
      const developerMix = [...devMap.entries()].map(([developerId, count]) => ({ developerId, name: store.developerById.get(developerId)?.name ?? developerId, count })).sort((a, b) => b.count - a.count);

      const bldgMap = new Map<string, number[]>();
      for (const t of areaTxns) if (t.buildingName) {
        if (!bldgMap.has(t.buildingName)) bldgMap.set(t.buildingName, []);
        bldgMap.get(t.buildingName)!.push(t.pricePerSqft);
      }
      const areaMedianPsf = area.medianSalePsf ?? median(areaTxns.map((t) => t.pricePerSqft)) ?? 0;
      const buildings = [...bldgMap.entries()].map(([name, vals]) => {
        const m = median(vals) ?? 0;
        return { name, medianPsf: Math.round(m), count: vals.length, vsAreaPct: areaMedianPsf > 0 ? Math.round(((m - areaMedianPsf) / areaMedianPsf) * 1000) / 10 : 0 };
      }).sort((a, b) => b.count - a.count);

      return { area, listings, priceSeries, rentSeries, developerMix, buildings, txnVolume12m: areaTxns.length };
    },

    async getDevelopers() {
      return store.ds.developers;
    },

    async getDeveloperDetail(id): Promise<DeveloperDetail | null> {
      const developer = store.developerById.get(id);
      if (!developer) return null;
      const projects = store.ds.projects.filter((p) => p.developerId === id);
      const listings = store.scored().filter((l) => l.developerId === id && !l.isDuplicate);
      const projectStats = projects.map((p) => {
        const ls = listings.filter((l) => l.projectId === p.id);
        const psfs = ls.map((l) => l.pricePerSqft).filter((x): x is number => x != null);
        return { projectId: p.id, name: p.name, avgPsf: psfs.length ? Math.round(percentile(psfs, 50)!) : null, listings: ls.length };
      });
      const sortedByScore = [...listings].sort((a, b) => b.score.totalDealScore - a.score.totalDealScore);
      return { developer, projects, listings, projectStats, bestDeals: sortedByScore.slice(0, 5), weakestDeals: sortedByScore.slice(-5).reverse() };
    },

    async getProjects() {
      return store.ds.projects;
    },

    async getProjectDetail(id): Promise<ProjectDetail | null> {
      const project = store.projectById.get(id);
      if (!project) return null;
      const listings = store.scored().filter((l) => l.projectId === id && !l.isDuplicate);
      const txns = store.ds.transactions.filter((t) => t.areaId === project.areaId);
      return {
        project,
        developer: store.developerById.get(project.developerId),
        area: store.areaById.get(project.areaId),
        listings,
        priceSeries: buildSeries(txns, project.areaId, "median_sale_psf"),
      };
    },

    async getPortfolio(userId) {
      const assets = store.portfolio.filter((a) => a.userId === userId);
      return { assets, summary: computePortfolioSummary(assets) };
    },

    async addPortfolioAsset(userId, asset) {
      const created: PortfolioAsset = {
        id: store.nextAssetId(),
        userId,
        assetName: asset.assetName ?? "New asset",
        listingId: asset.listingId,
        status: asset.status ?? "Owned",
        emirate: asset.emirate ?? "Dubai",
        areaId: asset.areaId ?? "dxb-dubai-marina",
        buildingOrProject: asset.buildingOrProject,
        developerId: asset.developerId,
        propertyType: asset.propertyType ?? "Apartment",
        sizeSqft: asset.sizeSqft ?? 0,
        purchasePriceAed: asset.purchasePriceAed ?? 0,
        acquisitionDate: asset.acquisitionDate,
        currentEstimatedValueAed: asset.currentEstimatedValueAed ?? asset.purchasePriceAed ?? 0,
        annualRentAed: asset.annualRentAed ?? 0,
        occupancyStatus: asset.occupancyStatus ?? "Unknown",
        leaseStart: asset.leaseStart,
        leaseEnd: asset.leaseEnd,
        mortgageBalanceAed: asset.mortgageBalanceAed ?? 0,
        interestRate: asset.interestRate ?? 0,
        monthlyPaymentAed: asset.monthlyPaymentAed ?? 0,
        serviceChargesAed: asset.serviceChargesAed ?? 0,
        maintenanceAed: asset.maintenanceAed ?? 0,
        managementFeeAed: asset.managementFeeAed ?? 0,
        insuranceAed: asset.insuranceAed ?? 0,
        otherExpensesAed: asset.otherExpensesAed ?? 0,
        notes: asset.notes,
        isSample: false,
      };
      store.portfolio.push(created);
      await hooks?.addAsset?.(created);
      return created;
    },

    async updatePortfolioAsset(id, patch) {
      const idx = store.portfolio.findIndex((a) => a.id === id);
      if (idx === -1) return null;
      store.portfolio[idx] = { ...store.portfolio[idx], ...patch, id };
      await hooks?.updateAsset?.(id, patch);
      return store.portfolio[idx];
    },

    async deletePortfolioAsset(id) {
      const before = store.portfolio.length;
      store.portfolio = store.portfolio.filter((a) => a.id !== id);
      const deleted = store.portfolio.length < before;
      if (deleted) await hooks?.deleteAsset?.(id);
      return deleted;
    },

    async getWatchlists(userId) {
      return store.ds.watchlists.filter((w) => w.userId === userId);
    },

    async getAlerts(userId) {
      return store.ds.alerts.filter((a) => a.userId === userId).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    },

    async getSourceHealth() {
      return store.ds.sources;
    },
  };
}

/** Default zero-config backend: the labeled SAMPLE dataset. */
export const memoryRepository: Repository = createDatasetRepository(buildSampleDataset(), { backend: "memory", isSample: true });
