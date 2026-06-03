/**
 * Loads the labeled SAMPLE dataset into a Postgres + PostGIS database.
 * Run with `npm run db:seed` (requires DATABASE_URL + applied migrations).
 *
 * All rows are inserted with is_sample=true and never overwrite user/production
 * data. Numeric values are stringified for the pg numeric type; geometry uses
 * the customType (EWKT). Best-effort, idempotent (onConflictDoNothing).
 */
import { loadEnv } from "../../lib/loadEnv";
loadEnv();
import { getDb, closeDb } from "../client";
import * as t from "../schema";
import { buildSampleDataset, DEFAULT_USER_ID } from ".";
import { PRESET_PROFILES } from "@/lib/recommender/profiles";

const n = (v: number | null | undefined) => (v == null ? null : String(v));
const d = (v: string | null | undefined) => (v ? new Date(v) : null);

async function main() {
  const db = getDb();
  const ds = buildSampleDataset();

  await db.insert(t.users).values([{ id: DEFAULT_USER_ID, displayName: "Default investor" }] as never).onConflictDoNothing();

  await db.insert(t.sources).values(
    ds.sources.map((s) => ({
      id: s.id, name: s.name, sourceType: s.sourceType, sourceClass: s.sourceClass, isOfficial: s.isOfficial,
      identifier: s.identifier, refreshFrequencyMinutes: s.refreshFrequencyMinutes, status: s.status,
      lastSuccessAt: d(s.lastSuccessAt), lastFailureAt: d(s.lastFailureAt), notes: s.notes,
    })) as never,
  ).onConflictDoNothing();

  await db.insert(t.areas).values(
    ds.areas.map((a) => ({
      id: a.id, name: a.name, emirate: a.emirate, masterCommunity: a.masterCommunity, lat: a.lat, lng: a.lng,
      geom: { lat: a.lat, lng: a.lng }, medianSalePsf: n(a.medianSalePsf), medianRentPsf: n(a.medianRentPsf),
      medianSalePrice: n(a.medianSalePrice), grossYield: n(a.grossYield), netYield: n(a.netYield),
      annualPriceChangePct: n(a.annualPriceChangePct), annualRentChangePct: n(a.annualRentChangePct),
      liquidityScore: a.liquidityScore, vacancyRiskScore: a.vacancyRiskScore, tenantDemandScore: a.tenantDemandScore,
      supplyPipelineUnits: a.supplyPipelineUnits, offPlanSharePct: n(a.offPlanSharePct), txnVolume12m: a.txnVolume12m,
      thesis: a.thesis, risks: a.risks, isSample: true, fieldProvenance: a.fieldProvenance,
    })) as never,
  ).onConflictDoNothing();

  await db.insert(t.developers).values(
    ds.developers.map((dv) => ({
      id: dv.id, name: dv.name, officialId: dv.officialId, emirate: dv.emirate, registrationStatus: dv.registrationStatus,
      website: dv.website, phone: dv.phone, email: dv.email, completedProjects: dv.completedProjects, activeProjects: dv.activeProjects,
      deliveredUnits: dv.deliveredUnits, avgDelayMonths: n(dv.avgDelayMonths), avgResalePremiumPct: n(dv.avgResalePremiumPct),
      qualityScore: dv.qualityScore, deliveryRiskScore: dv.deliveryRiskScore, serviceChargeRiskScore: dv.serviceChargeRiskScore,
      notes: dv.notes, isSample: true, confidenceScore: n(dv.confidenceScore),
    })) as never,
  ).onConflictDoNothing();

  await db.insert(t.projects).values(
    ds.projects.map((p) => ({
      id: p.id, developerId: p.developerId, name: p.name, emirate: p.emirate, areaId: p.areaId, status: p.status,
      launchDate: d(p.launchDate), handoverDate: d(p.handoverDate), projectType: p.projectType, officialProjectId: p.officialProjectId,
      lat: p.lat, lng: p.lng, geom: p.lat && p.lng ? { lat: p.lat, lng: p.lng } : null, isSample: true, confidenceScore: n(p.confidenceScore),
    })) as never,
  ).onConflictDoNothing();

  await db.insert(t.normalizedListings).values(
    ds.listings.map((l) => ({
      id: l.id, sourceId: l.sourceId, sourceClass: l.sourceClass, externalListingId: l.externalListingId, canonicalPropertyId: l.canonicalPropertyId,
      title: l.title, description: l.description, emirate: l.emirate, areaId: l.areaId, neighborhood: l.neighborhood, masterCommunity: l.masterCommunity,
      buildingName: l.buildingName, projectId: l.projectId, developerId: l.developerId, propertyType: l.propertyType, listingType: l.listingType,
      readyState: l.readyState, tenure: l.tenure, bedrooms: l.bedrooms, bathrooms: l.bathrooms, sizeSqft: n(l.sizeSqft),
      sizeSqm: n(l.sizeSqft ? l.sizeSqft / 10.7639 : null), askingPriceAed: n(l.askingPriceAed), pricePerSqft: n(l.pricePerSqft),
      furnishingStatus: l.furnishingStatus, occupancyStatus: l.occupancyStatus, serviceChargePsf: n(l.serviceChargePsf), handoverDate: d(l.handoverDate),
      lat: l.lat, lng: l.lng, geom: l.lat && l.lng ? { lat: l.lat, lng: l.lng } : null, addressText: l.addressText, listingUrl: l.listingUrl,
      imageUrls: l.imageUrls, agentName: l.agentName, agencyName: l.agencyName, publicPhone: l.publicPhone, publicEmail: l.publicEmail, whatsapp: l.whatsapp,
      listedAt: d(l.listedAt), firstSeenAt: d(l.firstSeenAt), lastSeenAt: d(l.lastSeenAt), lastRefreshedAt: d(l.lastRefreshedAt),
      status: l.status, isDuplicate: l.isDuplicate, duplicateClusterId: l.duplicateClusterId, priceHistory: l.priceHistory,
      reasonForSale: l.reasonForSale, hasPaymentPlan: l.hasPaymentPlan, isSample: true, fieldProvenance: l.fieldProvenance,
    })) as never,
  ).onConflictDoNothing();

  await db.insert(t.governmentTransactions).values(
    ds.transactions.map((x) => ({
      id: x.id, sourceId: x.sourceId, emirate: x.emirate, transactionDate: d(x.transactionDate)!, areaId: x.areaId, projectName: x.projectName,
      buildingName: x.buildingName, propertyType: x.propertyType, transactionType: x.transactionType, readyState: x.readyState,
      priceAed: n(x.priceAed), sizeSqft: n(x.sizeSqft), pricePerSqft: n(x.pricePerSqft), bedrooms: x.bedrooms, officialReference: x.officialReference, isSample: true,
    })) as never,
  ).onConflictDoNothing();

  await db.insert(t.governmentRents).values(
    ds.rents.map((x) => ({
      id: x.id, sourceId: x.sourceId, emirate: x.emirate, rentDate: d(x.rentDate)!, areaId: x.areaId, projectName: x.projectName, buildingName: x.buildingName,
      propertyType: x.propertyType, annualRentAed: n(x.annualRentAed), sizeSqft: n(x.sizeSqft), rentPerSqft: n(x.rentPerSqft), bedrooms: x.bedrooms, contractType: x.contractType, isSample: true,
    })) as never,
  ).onConflictDoNothing();

  await db.insert(t.paymentPlans).values(
    ds.paymentPlans.map((p) => ({
      id: p.id, listingId: p.listingId, planName: p.planName, downPaymentPercent: n(p.downPaymentPercent), bookingAmount: n(p.bookingAmount),
      duringConstructionPercent: n(p.duringConstructionPercent), onHandoverPercent: n(p.onHandoverPercent), postHandoverPercent: n(p.postHandoverPercent),
      numberOfInstallments: p.numberOfInstallments, rawText: p.rawText, normalizedScheduleJson: p.schedule, confidenceScore: n(p.confidenceScore),
    })) as never,
  ).onConflictDoNothing();

  await db.insert(t.portfolioAssets).values(
    ds.portfolio.map((a) => ({
      id: a.id, userId: a.userId, assetName: a.assetName, listingId: a.listingId, status: a.status, emirate: a.emirate, areaId: a.areaId,
      buildingOrProject: a.buildingOrProject, developerId: a.developerId, propertyType: a.propertyType, sizeSqft: n(a.sizeSqft), purchasePriceAed: n(a.purchasePriceAed),
      acquisitionDate: d(a.acquisitionDate), currentEstimatedValueAed: n(a.currentEstimatedValueAed), annualRentAed: n(a.annualRentAed), occupancyStatus: a.occupancyStatus,
      leaseStart: d(a.leaseStart), leaseEnd: d(a.leaseEnd), mortgageBalanceAed: n(a.mortgageBalanceAed), interestRate: n(a.interestRate), monthlyPaymentAed: n(a.monthlyPaymentAed),
      serviceChargesAed: n(a.serviceChargesAed), maintenanceAed: n(a.maintenanceAed), managementFeeAed: n(a.managementFeeAed), insuranceAed: n(a.insuranceAed),
      otherExpensesAed: n(a.otherExpensesAed), notes: a.notes, isSample: true,
    })) as never,
  ).onConflictDoNothing();

  await db.insert(t.watchlists).values(ds.watchlists.map((w) => ({ id: w.id, userId: w.userId, name: w.name, criteriaJson: w.criteria })) as never).onConflictDoNothing();
  await db.insert(t.watchlistItems).values(ds.watchlistItems.map((w) => ({ id: w.id, watchlistId: w.watchlistId, listingId: w.listingId, addedAt: d(w.addedAt), notes: w.notes, status: w.status })) as never).onConflictDoNothing();
  await db.insert(t.alerts).values(ds.alerts.map((a) => ({ id: a.id, userId: a.userId, alertType: a.alertType, listingId: a.listingId, assetId: a.assetId, severity: a.severity, title: a.title, message: a.message, createdAt: d(a.createdAt) })) as never).onConflictDoNothing();
  await db.insert(t.recommendationProfiles).values(PRESET_PROFILES.map((p) => ({ id: p.id, name: p.name, description: p.description, weightsJson: p.weights, filtersJson: p.filters, isPreset: true })) as never).onConflictDoNothing();

  console.log(`✓ Seeded SAMPLE data: ${ds.listings.length} listings, ${ds.transactions.length} txns, ${ds.rents.length} rents, ${ds.areas.length} areas, ${ds.developers.length} developers.`);
  await closeDb();
}

main().catch(async (e) => {
  console.error("Seed failed:", e);
  await closeDb();
  process.exit(1);
});
