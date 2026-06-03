import {
  pgTable,
  text,
  varchar,
  integer,
  doublePrecision,
  boolean,
  timestamp,
  jsonb,
  numeric,
  serial,
  customType,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";

/**
 * Production schema for Postgres + PostGIS. The in-memory SAMPLE repository is
 * the default at runtime; this schema + migrations exist so a real database can
 * be provisioned (`npm run db:generate && npm run db:migrate && npm run db:seed`).
 *
 * Geometry columns use PostGIS `geometry(Point,4326)`. The migration ensures the
 * extension exists (see src/db/migrate.ts).
 */
export const geometryPoint = customType<{ data: { lat: number; lng: number }; driverData: string }>({
  dataType() {
    return "geometry(Point,4326)";
  },
  toDriver(value) {
    return `SRID=4326;POINT(${value.lng} ${value.lat})`;
  },
});

export const users = pgTable("users", {
  id: varchar("id", { length: 64 }).primaryKey(),
  email: text("email"),
  displayName: text("display_name"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const sources = pgTable("sources", {
  id: varchar("id", { length: 64 }).primaryKey(),
  name: text("name").notNull(),
  sourceType: varchar("source_type", { length: 24 }).notNull(),
  sourceClass: varchar("source_class", { length: 32 }).notNull(),
  isOfficial: boolean("is_official").notNull().default(false),
  identifier: text("source_url_or_identifier"),
  refreshFrequencyMinutes: integer("refresh_frequency_minutes"),
  status: varchar("status", { length: 24 }).notNull().default("not_configured"),
  lastSuccessAt: timestamp("last_success_at", { withTimezone: true }),
  lastFailureAt: timestamp("last_failure_at", { withTimezone: true }),
  notes: text("notes"),
});

export const ingestionJobs = pgTable("ingestion_jobs", {
  id: serial("id").primaryKey(),
  sourceId: varchar("source_id", { length: 64 }).notNull(),
  jobType: varchar("job_type", { length: 32 }).notNull(),
  startedAt: timestamp("started_at", { withTimezone: true }).notNull(),
  finishedAt: timestamp("finished_at", { withTimezone: true }),
  status: varchar("status", { length: 24 }).notNull(),
  recordsSeen: integer("records_seen").default(0),
  recordsInserted: integer("records_inserted").default(0),
  recordsUpdated: integer("records_updated").default(0),
  recordsRejected: integer("records_rejected").default(0),
  errorMessage: text("error_message"),
});

export const rawRecords = pgTable(
  "raw_records",
  {
    id: serial("id").primaryKey(),
    sourceId: varchar("source_id", { length: 64 }).notNull(),
    externalId: text("external_id"),
    rawJson: jsonb("raw_json"),
    rawHash: varchar("raw_hash", { length: 64 }),
    firstSeenAt: timestamp("first_seen_at", { withTimezone: true }).defaultNow(),
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true }).defaultNow(),
  },
  (t) => ({ hashIdx: uniqueIndex("raw_records_source_hash_idx").on(t.sourceId, t.rawHash) }),
);

export const areas = pgTable("areas", {
  id: varchar("id", { length: 64 }).primaryKey(),
  name: text("name").notNull(),
  emirate: varchar("emirate", { length: 32 }).notNull(),
  masterCommunity: text("master_community"),
  lat: doublePrecision("lat"),
  lng: doublePrecision("lng"),
  geom: geometryPoint("geom"),
  medianSalePsf: numeric("median_sale_psf"),
  medianRentPsf: numeric("median_rent_psf"),
  medianSalePrice: numeric("median_sale_price"),
  grossYield: numeric("gross_yield"),
  netYield: numeric("net_yield"),
  annualPriceChangePct: numeric("annual_price_change_pct"),
  annualRentChangePct: numeric("annual_rent_change_pct"),
  liquidityScore: integer("liquidity_score"),
  vacancyRiskScore: integer("vacancy_risk_score"),
  tenantDemandScore: integer("tenant_demand_score"),
  supplyPipelineUnits: integer("supply_pipeline_units"),
  offPlanSharePct: numeric("off_plan_share_pct"),
  txnVolume12m: integer("txn_volume_12m"),
  thesis: text("thesis"),
  risks: jsonb("risks"),
  isSample: boolean("is_sample").notNull().default(false),
  fieldProvenance: jsonb("field_provenance"),
});

export const developers = pgTable("developers", {
  id: varchar("id", { length: 64 }).primaryKey(),
  name: text("name").notNull(),
  officialId: text("official_id"),
  emirate: varchar("emirate", { length: 32 }).notNull(),
  registrationStatus: text("registration_status"),
  sourceId: varchar("source_id", { length: 64 }),
  website: text("website"),
  phone: text("phone"),
  email: text("email"),
  completedProjects: integer("completed_projects"),
  activeProjects: integer("active_projects"),
  deliveredUnits: integer("delivered_units"),
  avgDelayMonths: numeric("avg_delay_months"),
  avgResalePremiumPct: numeric("avg_resale_premium_pct"),
  qualityScore: integer("quality_score"),
  deliveryRiskScore: integer("delivery_risk_score"),
  serviceChargeRiskScore: integer("service_charge_risk_score"),
  notes: text("notes"),
  isSample: boolean("is_sample").notNull().default(false),
  confidenceScore: numeric("confidence_score"),
});

export const projects = pgTable("projects", {
  id: varchar("id", { length: 64 }).primaryKey(),
  developerId: varchar("developer_id", { length: 64 }),
  name: text("name").notNull(),
  emirate: varchar("emirate", { length: 32 }).notNull(),
  areaId: varchar("area_id", { length: 64 }),
  status: varchar("status", { length: 32 }),
  launchDate: timestamp("launch_date", { withTimezone: true }),
  handoverDate: timestamp("handover_date", { withTimezone: true }),
  projectType: varchar("project_type", { length: 24 }),
  officialProjectId: text("official_project_id"),
  lat: doublePrecision("lat"),
  lng: doublePrecision("lng"),
  geom: geometryPoint("geom"),
  isSample: boolean("is_sample").notNull().default(false),
  confidenceScore: numeric("confidence_score"),
});

export const normalizedListings = pgTable(
  "normalized_listings",
  {
    id: varchar("id", { length: 80 }).primaryKey(),
    sourceId: varchar("source_id", { length: 64 }).notNull(),
    sourceClass: varchar("source_class", { length: 32 }).notNull(),
    externalListingId: text("external_listing_id"),
    canonicalPropertyId: text("canonical_property_id"),
    title: text("title").notNull(),
    description: text("description"),
    emirate: varchar("emirate", { length: 32 }).notNull(),
    areaId: varchar("area_id", { length: 64 }),
    neighborhood: text("neighborhood"),
    masterCommunity: text("master_community"),
    buildingName: text("building_name"),
    projectId: varchar("project_id", { length: 64 }),
    developerId: varchar("developer_id", { length: 64 }),
    propertyType: varchar("property_type", { length: 24 }),
    listingType: varchar("listing_type", { length: 16 }),
    readyState: varchar("ready_or_offplan", { length: 16 }),
    tenure: varchar("tenure", { length: 16 }),
    bedrooms: integer("bedrooms"),
    bathrooms: integer("bathrooms"),
    sizeSqft: numeric("size_sqft"),
    sizeSqm: numeric("size_sqm"),
    askingPriceAed: numeric("asking_price_aed"),
    pricePerSqft: numeric("price_per_sqft"),
    furnishingStatus: varchar("furnishing_status", { length: 24 }),
    occupancyStatus: varchar("occupancy_status", { length: 24 }),
    serviceChargePsf: numeric("service_charge_psf"),
    handoverDate: timestamp("handover_date", { withTimezone: true }),
    lat: doublePrecision("lat"),
    lng: doublePrecision("lng"),
    geom: geometryPoint("geom"),
    addressText: text("address_text"),
    listingUrl: text("listing_url"),
    imageUrls: jsonb("image_urls"),
    agentName: text("agent_name"),
    agencyName: text("agency_name"),
    publicPhone: text("public_phone"),
    publicEmail: text("public_email"),
    whatsapp: text("whatsapp"),
    listedAt: timestamp("listed_at", { withTimezone: true }),
    firstSeenAt: timestamp("first_seen_at", { withTimezone: true }).defaultNow(),
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true }).defaultNow(),
    lastRefreshedAt: timestamp("last_refreshed_at", { withTimezone: true }).defaultNow(),
    status: varchar("status", { length: 16 }).default("active"),
    isDuplicate: boolean("is_duplicate").default(false),
    duplicateClusterId: text("duplicate_cluster_id"),
    priceHistory: jsonb("price_history"),
    reasonForSale: jsonb("reason_for_sale"),
    hasPaymentPlan: boolean("has_payment_plan").default(false),
    isSample: boolean("is_sample").notNull().default(false),
    fieldProvenance: jsonb("field_provenance"),
    dataQualityScore: integer("data_quality_score"),
  },
  (t) => ({
    sourceExtIdx: uniqueIndex("listings_source_ext_idx").on(t.sourceId, t.externalListingId),
    areaIdx: index("listings_area_idx").on(t.areaId),
    emirateIdx: index("listings_emirate_idx").on(t.emirate),
  }),
);

export const governmentTransactions = pgTable(
  "government_transactions",
  {
    id: varchar("id", { length: 80 }).primaryKey(),
    sourceId: varchar("source_id", { length: 64 }).notNull(),
    emirate: varchar("emirate", { length: 32 }).notNull(),
    transactionDate: timestamp("transaction_date", { withTimezone: true }).notNull(),
    areaId: varchar("area_id", { length: 64 }),
    projectName: text("project_name"),
    buildingName: text("building_name"),
    propertyType: varchar("property_type", { length: 24 }),
    transactionType: varchar("transaction_type", { length: 16 }),
    readyState: varchar("ready_or_offplan", { length: 16 }),
    priceAed: numeric("price_aed"),
    sizeSqft: numeric("size_sqft"),
    pricePerSqft: numeric("price_per_sqft"),
    bedrooms: integer("bedrooms"),
    rawLocation: text("raw_location"),
    officialReference: text("official_reference"),
    rawJson: jsonb("raw_json"),
    isSample: boolean("is_sample").notNull().default(false),
  },
  (t) => ({ areaIdx: index("txn_area_idx").on(t.areaId), dateIdx: index("txn_date_idx").on(t.transactionDate) }),
);

export const governmentRents = pgTable("government_rents", {
  id: varchar("id", { length: 80 }).primaryKey(),
  sourceId: varchar("source_id", { length: 64 }).notNull(),
  emirate: varchar("emirate", { length: 32 }).notNull(),
  rentDate: timestamp("rent_date", { withTimezone: true }).notNull(),
  areaId: varchar("area_id", { length: 64 }),
  projectName: text("project_name"),
  buildingName: text("building_name"),
  propertyType: varchar("property_type", { length: 24 }),
  annualRentAed: numeric("annual_rent_aed"),
  sizeSqft: numeric("size_sqft"),
  rentPerSqft: numeric("rent_per_sqft"),
  bedrooms: integer("bedrooms"),
  contractType: varchar("contract_type", { length: 16 }),
  rawJson: jsonb("raw_json"),
  isSample: boolean("is_sample").notNull().default(false),
});

export const marketSeries = pgTable("market_series", {
  id: varchar("id", { length: 96 }).primaryKey(),
  emirate: varchar("emirate", { length: 32 }).notNull(),
  areaId: varchar("area_id", { length: 64 }),
  buildingOrProject: text("building_or_project"),
  metricName: varchar("metric_name", { length: 32 }).notNull(),
  periodStart: timestamp("period_start", { withTimezone: true }),
  periodEnd: timestamp("period_end", { withTimezone: true }),
  value: numeric("value"),
  sampleSize: integer("sample_size"),
  sourceId: varchar("source_id", { length: 64 }),
  confidenceScore: numeric("confidence_score"),
});

export const comps = pgTable("comps", {
  id: serial("id").primaryKey(),
  listingId: varchar("listing_id", { length: 80 }).notNull(),
  compType: varchar("comp_type", { length: 24 }),
  compTransactionId: varchar("comp_transaction_id", { length: 80 }),
  distanceKm: numeric("distance_km"),
  sameBuilding: boolean("same_building"),
  sameProject: boolean("same_project"),
  sameArea: boolean("same_area"),
  sameBedrooms: boolean("same_bedrooms"),
  samePropertyType: boolean("same_property_type"),
  recencyDays: integer("recency_days"),
  similarityScore: numeric("similarity_score"),
});

export const listingScores = pgTable("listing_scores", {
  listingId: varchar("listing_id", { length: 80 }).primaryKey(),
  estimatedMarketValue: numeric("estimated_market_value"),
  estimatedAnnualRent: numeric("estimated_annual_rent"),
  estimatedGrossYield: numeric("estimated_gross_yield"),
  estimatedNetYield: numeric("estimated_net_yield"),
  valueGapPercent: numeric("value_gap_percent"),
  priceScore: integer("price_score"),
  yieldScore: integer("yield_score"),
  rentDemandScore: integer("rent_demand_score"),
  liquidityScore: integer("liquidity_score"),
  developerScore: integer("developer_score"),
  paymentPlanScore: integer("payment_plan_score"),
  riskScore: integer("risk_score"),
  confidenceScore: integer("confidence_score"),
  totalDealScore: integer("total_deal_score"),
  scoreExplanationJson: jsonb("score_explanation_json"),
  calculatedAt: timestamp("calculated_at", { withTimezone: true }).defaultNow(),
});

export const paymentPlans = pgTable("payment_plans", {
  id: varchar("id", { length: 64 }).primaryKey(),
  listingId: varchar("listing_id", { length: 80 }).notNull(),
  planName: text("plan_name"),
  downPaymentPercent: numeric("down_payment_percent"),
  bookingAmount: numeric("booking_amount"),
  duringConstructionPercent: numeric("during_construction_percent"),
  onHandoverPercent: numeric("on_handover_percent"),
  postHandoverPercent: numeric("post_handover_percent"),
  numberOfInstallments: integer("number_of_installments"),
  rawText: text("raw_text"),
  normalizedScheduleJson: jsonb("normalized_schedule_json"),
  confidenceScore: numeric("confidence_score"),
});

export const portfolioAssets = pgTable("portfolio_assets", {
  id: varchar("id", { length: 64 }).primaryKey(),
  userId: varchar("user_id", { length: 64 }).notNull(),
  assetName: text("asset_name").notNull(),
  listingId: varchar("listing_id", { length: 80 }),
  status: varchar("status", { length: 24 }),
  emirate: varchar("emirate", { length: 32 }),
  areaId: varchar("area_id", { length: 64 }),
  buildingOrProject: text("building_or_project"),
  developerId: varchar("developer_id", { length: 64 }),
  propertyType: varchar("property_type", { length: 24 }),
  sizeSqft: numeric("size_sqft"),
  purchasePriceAed: numeric("purchase_price_aed"),
  acquisitionDate: timestamp("acquisition_date", { withTimezone: true }),
  currentEstimatedValueAed: numeric("current_estimated_value_aed"),
  annualRentAed: numeric("annual_rent_aed"),
  occupancyStatus: varchar("occupancy_status", { length: 24 }),
  leaseStart: timestamp("lease_start", { withTimezone: true }),
  leaseEnd: timestamp("lease_end", { withTimezone: true }),
  mortgageBalanceAed: numeric("mortgage_balance_aed"),
  interestRate: numeric("interest_rate"),
  monthlyPaymentAed: numeric("monthly_payment_aed"),
  serviceChargesAed: numeric("service_charges_aed"),
  maintenanceAed: numeric("maintenance_aed"),
  managementFeeAed: numeric("management_fee_aed"),
  insuranceAed: numeric("insurance_aed"),
  otherExpensesAed: numeric("other_expenses_aed"),
  notes: text("notes"),
  isSample: boolean("is_sample").notNull().default(false),
});

export const portfolioCashflows = pgTable("portfolio_cashflows", {
  id: varchar("id", { length: 64 }).primaryKey(),
  assetId: varchar("asset_id", { length: 64 }).notNull(),
  date: timestamp("date", { withTimezone: true }),
  cashflowType: varchar("cashflow_type", { length: 24 }),
  amountAed: numeric("amount_aed"),
  description: text("description"),
});

export const watchlists = pgTable("watchlists", {
  id: varchar("id", { length: 64 }).primaryKey(),
  userId: varchar("user_id", { length: 64 }).notNull(),
  name: text("name").notNull(),
  criteriaJson: jsonb("criteria_json"),
});

export const watchlistItems = pgTable("watchlist_items", {
  id: varchar("id", { length: 64 }).primaryKey(),
  watchlistId: varchar("watchlist_id", { length: 64 }).notNull(),
  listingId: varchar("listing_id", { length: 80 }).notNull(),
  addedAt: timestamp("added_at", { withTimezone: true }).defaultNow(),
  notes: text("notes"),
  status: varchar("status", { length: 16 }),
});

export const alerts = pgTable("alerts", {
  id: varchar("id", { length: 64 }).primaryKey(),
  userId: varchar("user_id", { length: 64 }).notNull(),
  alertType: varchar("alert_type", { length: 40 }),
  listingId: varchar("listing_id", { length: 80 }),
  assetId: varchar("asset_id", { length: 64 }),
  severity: varchar("severity", { length: 16 }),
  title: text("title"),
  message: text("message"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  readAt: timestamp("read_at", { withTimezone: true }),
});

export const reasonForSale = pgTable("reason_for_sale", {
  id: serial("id").primaryKey(),
  listingId: varchar("listing_id", { length: 80 }).notNull(),
  category: varchar("category", { length: 40 }),
  confidence: varchar("confidence", { length: 16 }),
  sourceClass: varchar("source_class", { length: 32 }),
  evidenceJson: jsonb("evidence_json"),
  explanation: text("explanation"),
});

export const importBatches = pgTable("import_batches", {
  id: serial("id").primaryKey(),
  importType: varchar("import_type", { length: 24 }),
  userId: varchar("user_id", { length: 64 }),
  rawText: text("raw_text"),
  acceptedRows: integer("accepted_rows"),
  rejectedRows: integer("rejected_rows"),
  errorsJson: jsonb("errors_json"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const recommendationProfiles = pgTable("recommendation_profiles", {
  id: varchar("id", { length: 64 }).primaryKey(),
  userId: varchar("user_id", { length: 64 }),
  name: text("name").notNull(),
  description: text("description"),
  weightsJson: jsonb("weights_json"),
  filtersJson: jsonb("filters_json"),
  isPreset: boolean("is_preset").default(false),
});
