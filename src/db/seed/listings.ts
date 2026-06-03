import type { Listing, FurnishingStatus, OccupancyStatus, PropertyType, ReadyState, ReasonForSale, Tenure } from "@/types/domain";
import { prov, UNAVAILABLE, type FieldProvenance, type SourceClass } from "@/lib/provenance";
import { AREA_BY_ID } from "./areas";
import { daysAgo, makeRng, SEED_NOW } from "./prng";

const obs = SEED_NOW.toISOString();

interface Spec {
  id: string;
  source: "pf" | "bayut" | "broker" | "developer";
  title: string;
  areaId: string;
  buildingName: string;
  projectId?: string;
  developerId?: string;
  propertyType?: PropertyType;
  readyState?: ReadyState;
  tenure?: Tenure;
  bedrooms: number;
  bathrooms?: number;
  sizeSqft: number;
  /** asking PSF as a multiple of the area median sale PSF (drives value gap). */
  psfVsMedian: number;
  furnishing?: FurnishingStatus;
  occupancy?: OccupancyStatus;
  serviceChargePsf?: number | null;
  handoverMonths?: number; // off-plan only
  listedDaysAgo: number;
  refreshedHoursAgo?: number;
  description: string;
  reason?: ReasonForSale;
  priceDrops?: number[]; // successive prior prices (oldest..newest before current)
  contact?: { agent?: string; agency?: string; phone?: string; email?: string; whatsapp?: string };
  hasPaymentPlan?: boolean;
  duplicateClusterId?: string;
  status?: Listing["status"];
  unknownSize?: boolean; // demonstrate "unavailable" handling
}

const SOURCE_META: Record<Spec["source"], { sourceId: string; sourceClass: SourceClass; agency: string }> = {
  pf: { sourceId: "property_finder", sourceClass: "portal_provided", agency: "Listed via Property Finder feed" },
  bayut: { sourceId: "bayut", sourceClass: "portal_provided", agency: "Listed via Bayut feed" },
  broker: { sourceId: "broker_csv", sourceClass: "broker_developer_provided", agency: "Broker CRM export" },
  developer: { sourceId: "developer_inventory", sourceClass: "broker_developer_provided", agency: "Developer inventory feed" },
};

function build(spec: Spec): Listing {
  const area = AREA_BY_ID.get(spec.areaId)!;
  const rng = makeRng(spec.id.split("").reduce((a, c) => a + c.charCodeAt(0), 0));
  const meta = SOURCE_META[spec.source];
  const medianPsf = area.medianSalePsf ?? 1200;
  const psf = Math.round(medianPsf * spec.psfVsMedian);
  const sizeKnown = !spec.unknownSize;
  const askingPriceAed = sizeKnown ? Math.round((psf * spec.sizeSqft) / 1000) * 1000 : Math.round(psf * spec.sizeSqft / 1000) * 1000;
  const pricePerSqft = sizeKnown ? psf : null;
  const readyState = spec.readyState ?? "Ready";
  const lat = area.lat + rng.range(-0.006, 0.006);
  const lng = area.lng + rng.range(-0.006, 0.006);

  // Build a price history if there were drops.
  let priceHistory: { date: string; price: number }[] | undefined;
  if (spec.priceDrops && spec.priceDrops.length) {
    priceHistory = spec.priceDrops.map((p, i) => ({
      date: daysAgo(spec.listedDaysAgo - Math.round((i * spec.listedDaysAgo) / (spec.priceDrops!.length + 1))),
      price: p,
    }));
    priceHistory.push({ date: daysAgo(spec.refreshedHoursAgo ? 0 : 1), price: askingPriceAed });
  }

  const valueProvClass: SourceClass = meta.sourceClass;
  const fp: FieldProvenance = {
    askingPriceAed: prov(valueProvClass, { sourceId: meta.sourceId, confidence: 0.95, observedAt: obs, method: "As listed" }),
    sizeSqft: sizeKnown
      ? prov(valueProvClass, { sourceId: meta.sourceId, confidence: 0.85, observedAt: obs })
      : UNAVAILABLE,
    pricePerSqft: sizeKnown
      ? prov("model_inferred", { sourceId: "scoring_engine", confidence: 0.85, observedAt: obs, method: "price ÷ size" })
      : UNAVAILABLE,
    bedrooms: prov(valueProvClass, { sourceId: meta.sourceId, confidence: 0.95, observedAt: obs }),
    serviceChargePsf:
      spec.serviceChargePsf == null
        ? UNAVAILABLE
        : prov("broker_developer_provided", { sourceId: meta.sourceId, confidence: 0.5, observedAt: obs, method: "Quoted by listing source; not gov-verified" }),
    occupancyStatus:
      (spec.occupancy ?? "Unknown") === "Unknown"
        ? UNAVAILABLE
        : prov(valueProvClass, { sourceId: meta.sourceId, confidence: 0.7, observedAt: obs }),
    handoverDate: readyState === "Off-Plan"
      ? prov("broker_developer_provided", { sourceId: meta.sourceId, confidence: 0.7, observedAt: obs })
      : UNAVAILABLE,
    publicPhone: spec.contact?.phone
      ? prov(valueProvClass, { sourceId: meta.sourceId, confidence: 0.8, observedAt: obs, notes: "Agent/agency public contact — not a private owner number" })
      : UNAVAILABLE,
    geo: prov("model_inferred", { sourceId: "geocoder", confidence: 0.5, observedAt: obs, method: "Approx. area centroid + jitter (sample)" }),
    developerId: spec.developerId
      ? prov(valueProvClass, { sourceId: meta.sourceId, confidence: 0.6, observedAt: obs })
      : UNAVAILABLE,
  };

  return {
    id: spec.id,
    sourceId: meta.sourceId,
    sourceClass: meta.sourceClass,
    externalListingId: `${meta.sourceId}-${spec.id}`,
    canonicalPropertyId: spec.duplicateClusterId ?? `cpid-${spec.id}`,
    title: spec.title,
    description: spec.description,
    emirate: area.emirate,
    areaId: spec.areaId,
    neighborhood: area.name,
    masterCommunity: area.masterCommunity,
    buildingName: spec.buildingName,
    projectId: spec.projectId,
    developerId: spec.developerId,
    propertyType: spec.propertyType ?? "Apartment",
    listingType: "Sale",
    readyState,
    tenure: spec.tenure ?? "Freehold",
    bedrooms: spec.bedrooms,
    bathrooms: spec.bathrooms ?? Math.max(1, spec.bedrooms),
    sizeSqft: sizeKnown ? spec.sizeSqft : null,
    askingPriceAed,
    pricePerSqft,
    furnishingStatus: spec.furnishing ?? "Unfurnished",
    occupancyStatus: spec.occupancy ?? "Unknown",
    serviceChargePsf: spec.serviceChargePsf,
    handoverDate: readyState === "Off-Plan" && spec.handoverMonths ? new Date(SEED_NOW.getTime() + spec.handoverMonths * 30 * 86_400_000).toISOString() : undefined,
    lat,
    lng,
    addressText: `${spec.buildingName}, ${area.name}, ${area.emirate}`,
    listingUrl: `https://example-portal.local/listing/${spec.id}`,
    imageUrls: [`https://picsum.photos/seed/${spec.id}/640/420`],
    agentName: spec.contact?.agent,
    agencyName: spec.contact?.agency ?? meta.agency,
    publicPhone: spec.contact?.phone,
    publicEmail: spec.contact?.email,
    whatsapp: spec.contact?.whatsapp,
    listedAt: daysAgo(spec.listedDaysAgo),
    firstSeenAt: daysAgo(spec.listedDaysAgo),
    lastSeenAt: daysAgo(0),
    lastRefreshedAt: new Date(SEED_NOW.getTime() - (spec.refreshedHoursAgo ?? 1) * 3_600_000).toISOString(),
    status: spec.status ?? (spec.listedDaysAgo > 120 ? "stale" : "active"),
    isDuplicate: !!spec.duplicateClusterId,
    duplicateClusterId: spec.duplicateClusterId,
    priceHistory,
    reasonForSale: spec.reason,
    hasPaymentPlan: spec.hasPaymentPlan ?? readyState === "Off-Plan",
    isSample: true,
    fieldProvenance: fp,
  };
}

const SPECS: Spec[] = [
  {
    id: "lst-marina-vista-2br",
    source: "pf",
    title: "Marina Vista — High-floor 2BR, full marina view",
    areaId: "dxb-dubai-marina",
    buildingName: "Marina Vista",
    projectId: "prj-emaar-marina-vista",
    developerId: "dev-emaar",
    bedrooms: 2,
    sizeSqft: 1180,
    psfVsMedian: 0.83, // ~17% below median → undervalued
    furnishing: "Furnished",
    occupancy: "Vacant",
    serviceChargePsf: 18,
    listedDaysAgo: 26,
    refreshedHoursAgo: 2,
    description:
      "Motivated seller — owner relocating abroad and needs a quick completion. Vacant on transfer, full marina views, Emaar build quality.",
    reason: {
      category: "explicitly_stated_urgent",
      confidence: "high",
      sourceClass: "portal_provided",
      evidence: ["Listing text: 'Motivated seller — owner relocating abroad and needs a quick completion'"],
      explanation: "Urgency is explicitly stated in the listing description (relocation + quick completion).",
    },
    priceDrops: [2150000, 2050000],
    contact: { agent: "S. Karim", agency: "Prime Marina Real Estate", phone: "+971 4 555 0101", whatsapp: "+971 50 555 0101" },
  },
  {
    id: "lst-marina-gate-1br",
    source: "bayut",
    title: "Marina Gate 1 — 1BR, chiller-free, tenanted",
    areaId: "dxb-dubai-marina",
    buildingName: "Marina Gate 1",
    developerId: "dev-emaar",
    bedrooms: 1,
    sizeSqft: 760,
    psfVsMedian: 1.02,
    furnishing: "Unfurnished",
    occupancy: "Tenanted",
    serviceChargePsf: 16,
    listedDaysAgo: 60,
    description:
      "Tenanted unit at AED 95,000/yr until Q1 next year — ideal for an investor seeking immediate income. Lease assignable on sale.",
    reason: {
      category: "tenant_occupied_sale",
      confidence: "high",
      sourceClass: "portal_provided",
      evidence: ["Listing text states an active lease being assigned on sale"],
      explanation: "Explicitly a tenanted-unit sale; lease assigned to buyer.",
    },
    contact: { agency: "Bayut-listed agency", phone: "+971 4 555 0202" },
  },
  {
    id: "lst-jvc-bloom-studio",
    source: "broker",
    title: "JVC Bloom Towers — Studio, high yield",
    areaId: "dxb-jvc",
    buildingName: "Bloom Towers",
    bedrooms: 0,
    sizeSqft: 430,
    psfVsMedian: 0.88,
    occupancy: "Vacant",
    serviceChargePsf: 14,
    listedDaysAgo: 14,
    description: "Vacant studio in JVC, strong rental demand. Clean title, ready to transfer.",
    reason: {
      category: "vacant_unit",
      confidence: "medium",
      sourceClass: "broker_developer_provided",
      evidence: ["Broker note: vacant", "No stated urgency"],
      explanation: "Vacant per broker note; no explicit motivation stated — treated as medium confidence.",
    },
    contact: { agent: "A. Rahman", agency: "Yield Hunters Brokerage", phone: "+971 4 555 0303", whatsapp: "+971 52 555 0303" },
  },
  {
    id: "lst-jvc-belgravia-2br",
    source: "pf",
    title: "Belgravia Heights — 2BR, priced to sell",
    areaId: "dxb-jvc",
    buildingName: "Belgravia Heights",
    bedrooms: 2,
    sizeSqft: 1120,
    psfVsMedian: 0.79, // deep discount
    occupancy: "Vacant",
    serviceChargePsf: 13,
    listedDaysAgo: 95,
    description: "Price reduced twice. Owner wants out before year-end. Below recent building comps.",
    reason: {
      category: "price_reduction_pattern",
      confidence: "medium",
      sourceClass: "model_inferred",
      evidence: ["Two recorded price reductions", "Listing age 95 days", "Asking ~21% below area median PSF"],
      explanation: "Repeated price reductions + extended days-on-market suggest a motivated seller (inferred, not explicitly stated).",
    },
    priceDrops: [1050000, 985000],
    contact: { agency: "Prime Marina Real Estate", phone: "+971 4 555 0404" },
  },
  {
    id: "lst-businessbay-damacbay-1br",
    source: "developer",
    title: "DAMAC Bay by Cavalli — 1BR off-plan, 70/30 plan",
    areaId: "dxb-business-bay",
    buildingName: "DAMAC Bay T1",
    projectId: "prj-damac-bay",
    developerId: "dev-damac",
    readyState: "Off-Plan",
    bedrooms: 1,
    sizeSqft: 720,
    psfVsMedian: 1.18, // off-plan premium
    handoverMonths: 22,
    serviceChargePsf: null,
    listedDaysAgo: 8,
    description:
      "Branded off-plan residence, 70/30 payment plan, handover in ~22 months. Booking 20%, construction-linked installments.",
    hasPaymentPlan: true,
    contact: { agency: "Developer inventory feed", phone: "+971 4 555 0505" },
  },
  {
    id: "lst-businessbay-riviera-studio",
    source: "broker",
    title: "Azizi Riviera — Studio near handover",
    areaId: "dxb-business-bay",
    buildingName: "Azizi Riviera 12",
    projectId: "prj-azizi-riviera",
    developerId: "dev-azizi",
    readyState: "Off-Plan",
    bedrooms: 0,
    sizeSqft: 400,
    psfVsMedian: 1.05,
    handoverMonths: 2,
    listedDaysAgo: 40,
    description: "Original-price resale before handover (assignment). Post-handover plan available from developer.",
    reason: {
      category: "handover_resale",
      confidence: "medium",
      sourceClass: "broker_developer_provided",
      evidence: ["Assignment before handover", "Handover ~2 months away"],
      explanation: "Pre-handover assignment — common investor exit timing.",
    },
    hasPaymentPlan: true,
    contact: { agency: "Yield Hunters Brokerage" },
  },
  {
    id: "lst-downtown-burjvista-2br",
    source: "pf",
    title: "Burj Vista 1 — 2BR, Burj Khalifa view",
    areaId: "dxb-downtown",
    buildingName: "Burj Vista 1",
    developerId: "dev-emaar",
    bedrooms: 2,
    sizeSqft: 1300,
    psfVsMedian: 1.06,
    furnishing: "Furnished",
    occupancy: "Owner-Occupied",
    serviceChargePsf: 22,
    listedDaysAgo: 18,
    description: "Prime Downtown residence with direct Burj Khalifa and fountain views. Trophy asset.",
    contact: { agent: "L. Haddad", agency: "Prime Downtown Realty", phone: "+971 4 555 0606" },
  },
  {
    id: "lst-dubaihills-parkheights-1br",
    source: "developer",
    title: "Park Heights — 1BR, handover in 4 months",
    areaId: "dxb-dubai-hills",
    buildingName: "Park Heights 1",
    projectId: "prj-emaar-creek-heights",
    developerId: "dev-emaar",
    readyState: "Off-Plan",
    bedrooms: 1,
    sizeSqft: 690,
    psfVsMedian: 0.96,
    handoverMonths: 4,
    listedDaysAgo: 22,
    description: "Near-complete Emaar 1BR in Dubai Hills, payment plan with post-handover component.",
    hasPaymentPlan: true,
    contact: { agency: "Developer inventory feed", phone: "+971 4 555 0707" },
  },
  {
    id: "lst-jlt-goldcrest-1br",
    source: "bayut",
    title: "Goldcrest Views 1 — 1BR, lake view",
    areaId: "dxb-jlt",
    buildingName: "Goldcrest Views 1",
    bedrooms: 1,
    sizeSqft: 820,
    psfVsMedian: 0.85,
    occupancy: "Vacant",
    serviceChargePsf: 15,
    listedDaysAgo: 33,
    description: "Spacious 1BR in JLT, vacant, priced below recent comps in the cluster.",
    contact: { agency: "Lake District Properties", phone: "+971 4 555 0808" },
  },
  {
    id: "lst-palm-shoreline-2br",
    source: "pf",
    title: "Shoreline Al Haseer — 2BR, beach access",
    areaId: "dxb-palm-jumeirah",
    buildingName: "Shoreline Al Haseer",
    developerId: "dev-nakheel",
    bedrooms: 2,
    sizeSqft: 1650,
    psfVsMedian: 0.92,
    furnishing: "Semi-Furnished",
    occupancy: "Tenanted",
    serviceChargePsf: 28,
    listedDaysAgo: 70,
    description: "Beachfront 2BR with private beach access. Tenanted on a short-let arrangement.",
    reason: {
      category: "investor_exit",
      confidence: "low",
      sourceClass: "model_inferred",
      evidence: ["Short-let tenancy", "Listed 70 days"],
      explanation: "Possible investor exit inferred from short-let usage and listing age — weak signal, low confidence.",
    },
    contact: { agent: "M. Saeed", agency: "Island Prime", phone: "+971 4 555 0909" },
  },
  {
    id: "lst-arjan-samana-studio",
    source: "developer",
    title: "Samana Greens — Studio with pool, 1% monthly plan",
    areaId: "dxb-arjan",
    buildingName: "Samana Greens",
    developerId: "dev-azizi",
    readyState: "Off-Plan",
    bedrooms: 0,
    sizeSqft: 420,
    psfVsMedian: 1.12,
    handoverMonths: 30,
    listedDaysAgo: 6,
    description: "Off-plan studio with private pool, aggressive 1%-per-month post-handover plan. Low down payment.",
    hasPaymentPlan: true,
    contact: { agency: "Developer inventory feed" },
  },
  {
    id: "lst-arjan-vincitore-1br",
    source: "broker",
    title: "Vincitore Boulevard — 1BR, top yield",
    areaId: "dxb-arjan",
    buildingName: "Vincitore Boulevard",
    bedrooms: 1,
    sizeSqft: 700,
    psfVsMedian: 0.86,
    occupancy: "Vacant",
    serviceChargePsf: 16,
    listedDaysAgo: 11,
    description: "Vacant 1BR in Arjan, strong gross yield versus asking price.",
    contact: { agency: "Yield Hunters Brokerage", phone: "+971 4 555 1010" },
  },
  // ── Abu Dhabi ──────────────────────────────────────────────────────────
  {
    id: "lst-reem-reflection-2br",
    source: "pf",
    title: "Reflection (Al Reem) — 2BR, sea view, vacant",
    areaId: "auh-al-reem-island",
    buildingName: "Reflection T1",
    projectId: "prj-aldar-reeman",
    developerId: "dev-aldar",
    bedrooms: 2,
    sizeSqft: 1180,
    psfVsMedian: 0.82,
    occupancy: "Vacant",
    serviceChargePsf: 15,
    listedDaysAgo: 28,
    description: "Vacant 2BR on Al Reem with sea views; priced below recent building comps. Freehold for all nationalities.",
    reason: {
      category: "vacant_unit",
      confidence: "medium",
      sourceClass: "portal_provided",
      evidence: ["Vacant", "Asking ~18% below area median PSF"],
      explanation: "Vacant and priced below comps; motivation not explicitly stated.",
    },
    contact: { agent: "R. Al Hashimi", agency: "Capital Island Realty", phone: "+971 2 555 1111" },
  },
  {
    id: "lst-yas-gardeniabay-1br",
    source: "developer",
    title: "Gardenia Bay — 1BR off-plan, Aldar 60/40 plan",
    areaId: "auh-yas-island",
    buildingName: "Gardenia Bay B1",
    projectId: "prj-aldar-gardenia-bay",
    developerId: "dev-aldar",
    readyState: "Off-Plan",
    bedrooms: 1,
    sizeSqft: 710,
    psfVsMedian: 1.1,
    handoverMonths: 24,
    listedDaysAgo: 9,
    description: "Aldar off-plan on Yas Island, 60/40 plan, 10% booking, handover ~24 months.",
    hasPaymentPlan: true,
    contact: { agency: "Developer inventory feed", phone: "+971 2 555 1212" },
  },
  {
    id: "lst-yas-watersedge-studio",
    source: "bayut",
    title: "Water's Edge — Studio, canal view",
    areaId: "auh-yas-island",
    buildingName: "Water's Edge B5",
    developerId: "dev-aldar",
    bedrooms: 0,
    sizeSqft: 410,
    psfVsMedian: 0.9,
    occupancy: "Tenanted",
    serviceChargePsf: 13,
    listedDaysAgo: 47,
    description: "Tenanted studio at Water's Edge, steady income, canal-facing.",
    reason: {
      category: "tenant_occupied_sale",
      confidence: "high",
      sourceClass: "portal_provided",
      evidence: ["Active tenancy stated in listing"],
      explanation: "Explicit tenanted sale.",
    },
    contact: { agency: "Yas Property Hub", phone: "+971 2 555 1313" },
  },
  {
    id: "lst-saadiyat-bloom-2br",
    source: "developer",
    title: "Bloom Living — 2BR townhouse, off-plan",
    areaId: "auh-saadiyat-island",
    buildingName: "Bloom Living S1",
    projectId: "prj-bloom-saadiyat",
    developerId: "dev-bloom",
    propertyType: "Townhouse",
    readyState: "Off-Plan",
    bedrooms: 2,
    sizeSqft: 1500,
    psfVsMedian: 1.0,
    handoverMonths: 20,
    listedDaysAgo: 16,
    description: "Mediterranean-themed off-plan townhouse community on Saadiyat with payment plan.",
    hasPaymentPlan: true,
    contact: { agency: "Developer inventory feed" },
  },
  {
    id: "lst-alraha-zeina-1br",
    source: "pf",
    title: "Al Zeina — 1BR, waterfront, tenanted",
    areaId: "auh-al-raha-beach",
    buildingName: "Al Zeina A1",
    developerId: "dev-aldar",
    bedrooms: 1,
    sizeSqft: 840,
    psfVsMedian: 0.95,
    occupancy: "Tenanted",
    serviceChargePsf: 14,
    listedDaysAgo: 52,
    description: "Waterfront 1BR at Al Zeina, tenanted with stable income.",
    contact: { agent: "K. Noor", agency: "Raha Beach Realty", phone: "+971 2 555 1414" },
  },
  {
    id: "lst-masdar-oasis-studio",
    source: "broker",
    title: "Oasis Residences — Studio, sustainable community",
    areaId: "auh-masdar-city",
    buildingName: "Oasis Residences 1",
    bedrooms: 0,
    sizeSqft: 450,
    psfVsMedian: 0.88,
    occupancy: "Vacant",
    serviceChargePsf: null,
    listedDaysAgo: 19,
    description: "Affordable studio in Masdar City; high headline yield. Service charge not disclosed by source.",
    contact: { agency: "Capital Island Realty" },
  },
  // A deliberate near-duplicate of the Marina Vista listing (different source) to exercise dedup.
  {
    id: "lst-marina-vista-2br-dup",
    source: "broker",
    title: "2BR Marina Vista, marina view — urgent sale",
    areaId: "dxb-dubai-marina",
    buildingName: "Marina Vista",
    projectId: "prj-emaar-marina-vista",
    developerId: "dev-emaar",
    bedrooms: 2,
    sizeSqft: 1185,
    psfVsMedian: 0.84,
    furnishing: "Furnished",
    occupancy: "Vacant",
    serviceChargePsf: 18,
    listedDaysAgo: 24,
    description: "Urgent — same unit cross-listed by another agency. Marina Vista 2BR, vacant.",
    duplicateClusterId: "dup-marina-vista-2br",
    status: "duplicate",
    contact: { agency: "Yield Hunters Brokerage", phone: "+971 4 555 0303" },
  },
  // A listing with UNKNOWN size to exercise "unavailable" handling end-to-end.
  {
    id: "lst-jlt-saba-1br-nosize",
    source: "bayut",
    title: "Saba Tower 3 — 1BR (size not provided by source)",
    areaId: "dxb-jlt",
    buildingName: "Saba Tower 3",
    bedrooms: 1,
    sizeSqft: 780, // used only to derive an approximate price; size shown as unavailable
    psfVsMedian: 0.93,
    occupancy: "Unknown",
    serviceChargePsf: null,
    listedDaysAgo: 5,
    description: "1BR in Saba Tower 3. The source feed did not include unit size; PSF/yield cannot be computed reliably.",
    unknownSize: true,
    contact: { agency: "Lake District Properties" },
  },
  {
    id: "lst-downtown-forte-1br-stale",
    source: "pf",
    title: "Forte 1 — 1BR (older listing)",
    areaId: "dxb-downtown",
    buildingName: "Forte 1",
    developerId: "dev-emaar",
    bedrooms: 1,
    sizeSqft: 740,
    psfVsMedian: 1.2, // overpriced
    occupancy: "Unknown",
    serviceChargePsf: 21,
    listedDaysAgo: 165,
    refreshedHoursAgo: 240,
    description: "Downtown 1BR. Listing has been live a long time without price movement.",
    status: "stale",
    contact: { agency: "Prime Downtown Realty" },
  },
];

export const SAMPLE_LISTINGS: Listing[] = SPECS.map(build);
export const LISTING_BY_ID = new Map(SAMPLE_LISTINGS.map((l) => [l.id, l]));
