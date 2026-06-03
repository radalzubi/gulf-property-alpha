import type {
  Alert,
  Area,
  Developer,
  Emirate,
  FurnishingStatus,
  GovRent,
  GovTransaction,
  ListingType,
  OccupancyStatus,
  PaymentInstallment,
  PaymentPlan,
  PortfolioAsset,
  PortfolioCashflow,
  Project,
  PropertyType,
  ReadyState,
  ReasonForSale,
  Tenure,
  Listing,
  Watchlist,
  WatchlistItem,
  DataSource,
  SourceType,
} from "@/types/domain";
import type { FieldProvenance, SourceClass } from "@/lib/provenance";
import type { SampleDataset } from "@/db/seed";
import type { Repository } from "./types";
import { createDatasetRepository, type PortfolioHooks } from "./memory";

// ── value coercion helpers (pg numeric → number, timestamp → ISO) ────────────
const n = (v: unknown): number | null => (v == null ? null : Number(v));
const nz = (v: unknown, d = 0): number => (v == null ? d : Number(v));
const iso = (v: unknown): string | undefined => (v ? new Date(v as string | Date).toISOString() : undefined);
const str = (v: unknown): string | undefined => (v == null ? undefined : String(v));

const excludeSample = () => process.env.EXCLUDE_SAMPLE_DATA === "true";
const rows = (arr: unknown): Record<string, unknown>[] => arr as Record<string, unknown>[];
const keepSample = (r: Record<string, unknown>): boolean => !excludeSample() || !r.isSample;

/** Loads every input table from Postgres and maps rows back to domain types. */
async function loadDataset(): Promise<SampleDataset> {
  const { getDb } = await import("@/db/client");
  const t = await import("@/db/schema");
  const db = getDb();

  const [areas, developers, projects, listings, txns, rents, plans, sources, portfolio, cashflows, watchlists, wItems, alerts] = await Promise.all([
    db.select().from(t.areas),
    db.select().from(t.developers),
    db.select().from(t.projects),
    db.select().from(t.normalizedListings),
    db.select().from(t.governmentTransactions),
    db.select().from(t.governmentRents),
    db.select().from(t.paymentPlans),
    db.select().from(t.sources),
    db.select().from(t.portfolioAssets),
    db.select().from(t.portfolioCashflows),
    db.select().from(t.watchlists),
    db.select().from(t.watchlistItems),
    db.select().from(t.alerts),
  ]);

  const mappedAreas: Area[] = rows(areas).filter(keepSample).map((a: Record<string, unknown>) => ({
    id: a.id as string,
    name: a.name as string,
    emirate: a.emirate as Emirate,
    masterCommunity: str(a.masterCommunity),
    lat: nz(a.lat),
    lng: nz(a.lng),
    medianSalePsf: n(a.medianSalePsf) ?? undefined,
    medianRentPsf: n(a.medianRentPsf) ?? undefined,
    medianSalePrice: n(a.medianSalePrice) ?? undefined,
    grossYield: n(a.grossYield) ?? undefined,
    netYield: n(a.netYield) ?? undefined,
    annualPriceChangePct: n(a.annualPriceChangePct) ?? undefined,
    annualRentChangePct: n(a.annualRentChangePct) ?? undefined,
    liquidityScore: n(a.liquidityScore) ?? undefined,
    vacancyRiskScore: n(a.vacancyRiskScore) ?? undefined,
    tenantDemandScore: n(a.tenantDemandScore) ?? undefined,
    supplyPipelineUnits: n(a.supplyPipelineUnits) ?? undefined,
    offPlanSharePct: n(a.offPlanSharePct) ?? undefined,
    txnVolume12m: n(a.txnVolume12m) ?? undefined,
    thesis: str(a.thesis),
    risks: (a.risks as string[]) ?? undefined,
    isSample: !!a.isSample,
    fieldProvenance: (a.fieldProvenance as FieldProvenance) ?? undefined,
  }));

  const mappedDevelopers: Developer[] = rows(developers).filter(keepSample).map((d: Record<string, unknown>) => ({
    id: d.id as string,
    name: d.name as string,
    officialId: str(d.officialId),
    emirate: d.emirate as Emirate,
    registrationStatus: str(d.registrationStatus),
    website: str(d.website),
    phone: str(d.phone),
    email: str(d.email),
    completedProjects: n(d.completedProjects) ?? undefined,
    activeProjects: n(d.activeProjects) ?? undefined,
    deliveredUnits: n(d.deliveredUnits) ?? undefined,
    avgDelayMonths: n(d.avgDelayMonths),
    avgResalePremiumPct: n(d.avgResalePremiumPct),
    qualityScore: n(d.qualityScore) ?? undefined,
    deliveryRiskScore: n(d.deliveryRiskScore) ?? undefined,
    serviceChargeRiskScore: n(d.serviceChargeRiskScore) ?? undefined,
    notes: str(d.notes),
    isSample: !!d.isSample,
    confidenceScore: n(d.confidenceScore) ?? undefined,
  }));

  const mappedProjects: Project[] = rows(projects).filter(keepSample).map((p: Record<string, unknown>) => ({
    id: p.id as string,
    developerId: p.developerId as string,
    name: p.name as string,
    emirate: p.emirate as Emirate,
    areaId: p.areaId as string,
    status: (p.status as Project["status"]) ?? "Unknown",
    launchDate: iso(p.launchDate),
    handoverDate: iso(p.handoverDate),
    projectType: (p.projectType as PropertyType) ?? undefined,
    officialProjectId: str(p.officialProjectId),
    lat: n(p.lat) ?? undefined,
    lng: n(p.lng) ?? undefined,
    isSample: !!p.isSample,
    confidenceScore: n(p.confidenceScore) ?? undefined,
  }));

  const mappedListings: Listing[] = rows(listings).filter(keepSample).map((l: Record<string, unknown>) => ({
    id: l.id as string,
    sourceId: l.sourceId as string,
    sourceClass: l.sourceClass as SourceClass,
    externalListingId: str(l.externalListingId),
    canonicalPropertyId: str(l.canonicalPropertyId),
    title: l.title as string,
    description: str(l.description),
    emirate: l.emirate as Emirate,
    areaId: l.areaId as string,
    neighborhood: str(l.neighborhood),
    masterCommunity: str(l.masterCommunity),
    buildingName: str(l.buildingName),
    projectId: str(l.projectId),
    developerId: str(l.developerId),
    propertyType: (l.propertyType as PropertyType) ?? "Apartment",
    listingType: (l.listingType as ListingType) ?? "Sale",
    readyState: (l.readyState as ReadyState) ?? "Ready",
    tenure: (l.tenure as Tenure) ?? "Unknown",
    bedrooms: n(l.bedrooms),
    bathrooms: n(l.bathrooms),
    sizeSqft: n(l.sizeSqft),
    askingPriceAed: n(l.askingPriceAed),
    pricePerSqft: n(l.pricePerSqft),
    furnishingStatus: (l.furnishingStatus as FurnishingStatus) ?? "Unknown",
    occupancyStatus: (l.occupancyStatus as OccupancyStatus) ?? "Unknown",
    serviceChargePsf: n(l.serviceChargePsf),
    handoverDate: iso(l.handoverDate),
    lat: n(l.lat) ?? undefined,
    lng: n(l.lng) ?? undefined,
    addressText: str(l.addressText),
    listingUrl: str(l.listingUrl),
    imageUrls: (l.imageUrls as string[]) ?? [],
    agentName: str(l.agentName),
    agencyName: str(l.agencyName),
    publicPhone: str(l.publicPhone),
    publicEmail: str(l.publicEmail),
    whatsapp: str(l.whatsapp),
    listedAt: iso(l.listedAt),
    firstSeenAt: iso(l.firstSeenAt) ?? new Date().toISOString(),
    lastSeenAt: iso(l.lastSeenAt) ?? new Date().toISOString(),
    lastRefreshedAt: iso(l.lastRefreshedAt) ?? new Date().toISOString(),
    status: (l.status as Listing["status"]) ?? "active",
    isDuplicate: !!l.isDuplicate,
    duplicateClusterId: str(l.duplicateClusterId),
    priceHistory: (l.priceHistory as { date: string; price: number }[]) ?? undefined,
    reasonForSale: (l.reasonForSale as ReasonForSale) ?? undefined,
    hasPaymentPlan: !!l.hasPaymentPlan,
    isSample: !!l.isSample,
    fieldProvenance: (l.fieldProvenance as FieldProvenance) ?? {},
    dataQualityScore: n(l.dataQualityScore) ?? undefined,
  }));

  const mappedTxns: GovTransaction[] = rows(txns).filter(keepSample).map((x: Record<string, unknown>) => ({
    id: x.id as string,
    sourceId: x.sourceId as string,
    emirate: x.emirate as Emirate,
    transactionDate: iso(x.transactionDate) ?? new Date().toISOString(),
    areaId: x.areaId as string,
    projectName: str(x.projectName),
    buildingName: str(x.buildingName),
    propertyType: (x.propertyType as PropertyType) ?? "Apartment",
    transactionType: (x.transactionType as GovTransaction["transactionType"]) ?? "Sale",
    readyState: (x.readyState as ReadyState) ?? "Ready",
    priceAed: nz(x.priceAed),
    sizeSqft: nz(x.sizeSqft),
    pricePerSqft: nz(x.pricePerSqft),
    bedrooms: n(x.bedrooms),
    officialReference: str(x.officialReference),
    isSample: !!x.isSample,
  }));

  const mappedRents: GovRent[] = rows(rents).filter(keepSample).map((x: Record<string, unknown>) => ({
    id: x.id as string,
    sourceId: x.sourceId as string,
    emirate: x.emirate as Emirate,
    rentDate: iso(x.rentDate) ?? new Date().toISOString(),
    areaId: x.areaId as string,
    projectName: str(x.projectName),
    buildingName: str(x.buildingName),
    propertyType: (x.propertyType as PropertyType) ?? "Apartment",
    annualRentAed: nz(x.annualRentAed),
    sizeSqft: nz(x.sizeSqft),
    rentPerSqft: nz(x.rentPerSqft),
    bedrooms: n(x.bedrooms),
    contractType: (x.contractType as GovRent["contractType"]) ?? "New",
    isSample: !!x.isSample,
  }));

  const mappedPlans: PaymentPlan[] = (plans as Record<string, unknown>[]).map((p) => {
    const schedule = ((p.normalizedScheduleJson as PaymentInstallment[]) ?? []) || [];
    const handover = schedule.find((s) => s.milestone === "handover");
    return {
      id: p.id as string,
      listingId: p.listingId as string,
      planName: str(p.planName),
      downPaymentPercent: n(p.downPaymentPercent) ?? undefined,
      bookingAmount: n(p.bookingAmount) ?? undefined,
      duringConstructionPercent: n(p.duringConstructionPercent) ?? undefined,
      onHandoverPercent: n(p.onHandoverPercent) ?? undefined,
      postHandoverPercent: n(p.postHandoverPercent) ?? undefined,
      numberOfInstallments: n(p.numberOfInstallments) ?? undefined,
      handoverMonths: handover?.monthOffset,
      rawText: str(p.rawText),
      schedule,
      confidenceScore: n(p.confidenceScore) ?? undefined,
      sourceClass: "broker_developer_provided",
    };
  });

  const mappedSources: DataSource[] = (sources as Record<string, unknown>[]).map((s) => ({
    id: s.id as string,
    name: s.name as string,
    sourceType: (s.sourceType as SourceType) ?? "user",
    sourceClass: (s.sourceClass as SourceClass) ?? "source_provided",
    isOfficial: !!s.isOfficial,
    identifier: str(s.identifier),
    refreshFrequencyMinutes: n(s.refreshFrequencyMinutes),
    status: (s.status as DataSource["status"]) ?? "ok",
    lastSuccessAt: iso(s.lastSuccessAt),
    lastFailureAt: iso(s.lastFailureAt),
    notes: str(s.notes),
  }));

  const mappedPortfolio: PortfolioAsset[] = (portfolio as Record<string, unknown>[]).map((a) => ({
    id: a.id as string,
    userId: a.userId as string,
    assetName: a.assetName as string,
    listingId: str(a.listingId),
    status: (a.status as PortfolioAsset["status"]) ?? "Owned",
    emirate: (a.emirate as Emirate) ?? "Dubai",
    areaId: (a.areaId as string) ?? "",
    buildingOrProject: str(a.buildingOrProject),
    developerId: str(a.developerId),
    propertyType: (a.propertyType as PropertyType) ?? "Apartment",
    sizeSqft: nz(a.sizeSqft),
    purchasePriceAed: nz(a.purchasePriceAed),
    acquisitionDate: iso(a.acquisitionDate),
    currentEstimatedValueAed: nz(a.currentEstimatedValueAed),
    annualRentAed: nz(a.annualRentAed),
    occupancyStatus: (a.occupancyStatus as OccupancyStatus) ?? "Unknown",
    leaseStart: iso(a.leaseStart),
    leaseEnd: iso(a.leaseEnd),
    mortgageBalanceAed: nz(a.mortgageBalanceAed),
    interestRate: nz(a.interestRate),
    monthlyPaymentAed: nz(a.monthlyPaymentAed),
    serviceChargesAed: nz(a.serviceChargesAed),
    maintenanceAed: nz(a.maintenanceAed),
    managementFeeAed: nz(a.managementFeeAed),
    insuranceAed: nz(a.insuranceAed),
    otherExpensesAed: nz(a.otherExpensesAed),
    notes: str(a.notes),
    isSample: !!a.isSample,
  }));

  const mappedCashflows: PortfolioCashflow[] = (cashflows as Record<string, unknown>[]).map((c) => ({
    id: c.id as string,
    assetId: c.assetId as string,
    date: iso(c.date) ?? new Date().toISOString(),
    cashflowType: (c.cashflowType as PortfolioCashflow["cashflowType"]) ?? "rent",
    amountAed: nz(c.amountAed),
    description: str(c.description),
  }));

  const itemCounts = new Map<string, number>();
  for (const it of wItems as Record<string, unknown>[]) itemCounts.set(it.watchlistId as string, (itemCounts.get(it.watchlistId as string) ?? 0) + 1);
  const mappedWatchlists: Watchlist[] = (watchlists as Record<string, unknown>[]).map((w) => ({
    id: w.id as string,
    userId: w.userId as string,
    name: w.name as string,
    criteria: (w.criteriaJson as Record<string, unknown>) ?? undefined,
    itemCount: itemCounts.get(w.id as string) ?? 0,
  }));
  const mappedWItems: WatchlistItem[] = (wItems as Record<string, unknown>[]).map((it) => ({
    id: it.id as string,
    watchlistId: it.watchlistId as string,
    listingId: it.listingId as string,
    addedAt: iso(it.addedAt) ?? new Date().toISOString(),
    notes: str(it.notes),
    status: (it.status as WatchlistItem["status"]) ?? "watching",
  }));
  const mappedAlerts: Alert[] = (alerts as Record<string, unknown>[]).map((a) => ({
    id: a.id as string,
    userId: a.userId as string,
    alertType: (a.alertType as Alert["alertType"]) ?? "new_match",
    listingId: str(a.listingId),
    assetId: str(a.assetId),
    severity: (a.severity as Alert["severity"]) ?? "info",
    title: (a.title as string) ?? "",
    message: (a.message as string) ?? "",
    createdAt: iso(a.createdAt) ?? new Date().toISOString(),
    readAt: iso(a.readAt),
  }));

  return {
    areas: mappedAreas,
    developers: mappedDevelopers,
    projects: mappedProjects,
    listings: mappedListings,
    paymentPlans: mappedPlans,
    transactions: mappedTxns,
    rents: mappedRents,
    sources: mappedSources,
    portfolio: mappedPortfolio,
    cashflows: mappedCashflows,
    watchlists: mappedWatchlists,
    watchlistItems: mappedWItems,
    alerts: mappedAlerts,
  };
}

// ── portfolio write-through hooks (persist mutations to the DB) ───────────────
const hooks: PortfolioHooks = {
  async addAsset(a: PortfolioAsset) {
    const { getDb } = await import("@/db/client");
    const t = await import("@/db/schema");
    const s = (v: number) => String(v);
    await getDb()
      .insert(t.portfolioAssets)
      .values({
        id: a.id, userId: a.userId, assetName: a.assetName, listingId: a.listingId, status: a.status, emirate: a.emirate, areaId: a.areaId,
        buildingOrProject: a.buildingOrProject, developerId: a.developerId, propertyType: a.propertyType, sizeSqft: s(a.sizeSqft),
        purchasePriceAed: s(a.purchasePriceAed), acquisitionDate: a.acquisitionDate ? new Date(a.acquisitionDate) : null,
        currentEstimatedValueAed: s(a.currentEstimatedValueAed), annualRentAed: s(a.annualRentAed), occupancyStatus: a.occupancyStatus,
        mortgageBalanceAed: s(a.mortgageBalanceAed), interestRate: s(a.interestRate), monthlyPaymentAed: s(a.monthlyPaymentAed),
        serviceChargesAed: s(a.serviceChargesAed), maintenanceAed: s(a.maintenanceAed), managementFeeAed: s(a.managementFeeAed),
        insuranceAed: s(a.insuranceAed), otherExpensesAed: s(a.otherExpensesAed), notes: a.notes, isSample: false,
      } as never)
      .onConflictDoNothing();
    invalidate();
  },
  async deleteAsset(id: string) {
    const { getDb } = await import("@/db/client");
    const t = await import("@/db/schema");
    const { eq } = await import("drizzle-orm");
    await getDb().delete(t.portfolioAssets).where(eq(t.portfolioAssets.id, id));
    invalidate();
  },
};

// ── TTL cache so freshly-ingested rows surface without per-request reloads ────
let cache: { repo: Repository; at: number } | null = null;
const TTL_MS = 30_000;
function invalidate() {
  cache = null;
}
async function getRepo(): Promise<Repository> {
  if (cache && Date.now() - cache.at < TTL_MS) return cache.repo;
  const ds = await loadDataset();
  const repo = createDatasetRepository(ds, { backend: "postgres", isSample: false, hooks });
  cache = { repo, at: Date.now() };
  return repo;
}

/** Postgres-backed repository: loads input rows from the DB and reuses the
 *  shared dataset engine (same scoring/queries as the sample backend). */
export async function createPostgresRepository(): Promise<Repository> {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is not set");
  // Probe once so getRepository() can fall back to sample if the DB is unreachable.
  await getRepo();
  return {
    backend: "postgres",
    isSampleData: false,
    getListings: async (q) => (await getRepo()).getListings(q),
    getListing: async (id) => (await getRepo()).getListing(id),
    getListingScore: async (id) => (await getRepo()).getListingScore(id),
    getListingComps: async (id) => (await getRepo()).getListingComps(id),
    getRecommendations: async (i) => (await getRepo()).getRecommendations(i),
    getAreas: async () => (await getRepo()).getAreas(),
    getAreaDetail: async (id) => (await getRepo()).getAreaDetail(id),
    getDevelopers: async () => (await getRepo()).getDevelopers(),
    getDeveloperDetail: async (id) => (await getRepo()).getDeveloperDetail(id),
    getProjects: async () => (await getRepo()).getProjects(),
    getProjectDetail: async (id) => (await getRepo()).getProjectDetail(id),
    getPortfolio: async (u) => (await getRepo()).getPortfolio(u),
    addPortfolioAsset: async (u, a) => (await getRepo()).addPortfolioAsset(u, a),
    updatePortfolioAsset: async (id, p) => (await getRepo()).updatePortfolioAsset(id, p),
    deletePortfolioAsset: async (id) => (await getRepo()).deletePortfolioAsset(id),
    getWatchlists: async (u) => (await getRepo()).getWatchlists(u),
    getAlerts: async (u) => (await getRepo()).getAlerts(u),
    getSourceHealth: async () => (await getRepo()).getSourceHealth(),
  };
}
