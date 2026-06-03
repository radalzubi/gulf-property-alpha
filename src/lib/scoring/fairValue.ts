import type { Comp, GovTransaction, Listing, Project } from "@/types/domain";
import { percentile, removeOutliers, weightedMedian } from "@/lib/utils";

export interface FairValueResult {
  fairPsf: number | null;
  estimatedValueAed: number | null;
  estimatedValueLow: number | null;
  estimatedValueHigh: number | null;
  medianBuildingPsf: number | null;
  medianAreaPsf: number | null;
  comps: Comp[];
  compCount: number;
  /** 0..1 */
  confidence: number;
  txnVolume: number; // count of same-area txns (liquidity proxy)
}

const TIER_WEIGHT: Record<Comp["compType"], number> = {
  same_building: 1.0,
  same_project: 0.8,
  same_area: 0.55,
  neighborhood: 0.3,
};

const RECENCY_HALF_LIFE_DAYS = 180; // weight halves every ~6 months

/** Builds comparable set + a fair value estimate for a listing. */
export function estimateFairValue(
  listing: Listing,
  transactions: GovTransaction[],
  opts: { project?: Project; now?: Date } = {},
): FairValueResult {
  const now = opts.now ?? new Date();
  const sameEmirate = transactions.filter((t) => t.emirate === listing.emirate && t.transactionType === "Sale");

  const projectName = opts.project?.name;
  const comps: Comp[] = [];
  for (const t of sameEmirate) {
    let tier: Comp["compType"] | null = null;
    if (t.areaId === listing.areaId && listing.buildingName && t.buildingName === listing.buildingName) tier = "same_building";
    else if (projectName && t.projectName && t.projectName === projectName) tier = "same_project";
    else if (t.areaId === listing.areaId) tier = "same_area";
    else tier = "neighborhood";

    // Only use neighborhood comps if we are short on closer ones (handled after).
    const recencyDays = Math.max(0, (now.getTime() - new Date(t.transactionDate).getTime()) / 86_400_000);
    const recencyFactor = Math.pow(0.5, recencyDays / RECENCY_HALF_LIFE_DAYS);

    const sameBedrooms = listing.bedrooms != null && t.bedrooms === listing.bedrooms;
    const bedroomFactor = sameBedrooms ? 1 : listing.bedrooms != null && t.bedrooms != null ? 1 / (1 + Math.abs(t.bedrooms - listing.bedrooms)) : 0.6;

    const sizeFactor =
      listing.sizeSqft && t.sizeSqft
        ? Math.max(0.25, 1 - Math.min(1, Math.abs(t.sizeSqft - listing.sizeSqft) / Math.max(listing.sizeSqft, 1)))
        : 0.6;

    const typeFactor = t.propertyType === listing.propertyType ? 1 : 0.4;

    const similarityScore = bedroomFactor * sizeFactor * typeFactor;
    const weight = TIER_WEIGHT[tier] * recencyFactor * similarityScore;

    comps.push({
      compTransactionId: t.id,
      compType: tier,
      pricePerSqft: t.pricePerSqft,
      priceAed: t.priceAed,
      sizeSqft: t.sizeSqft,
      bedrooms: t.bedrooms,
      transactionDate: t.transactionDate,
      sameBedrooms,
      recencyDays: Math.round(recencyDays),
      similarityScore: Math.round(similarityScore * 100) / 100,
      weight,
    });
  }

  // Prefer the closest tiers; only fall back to broader tiers when sparse.
  const byTier = (tier: Comp["compType"]) => comps.filter((c) => c.compType === tier);
  let selected: Comp[] = [];
  for (const tier of ["same_building", "same_project", "same_area", "neighborhood"] as const) {
    if (selected.length >= 8) break;
    selected = selected.concat(byTier(tier));
  }
  // Keep best 40 by weight to bound noise.
  selected = selected.sort((a, b) => b.weight - a.weight).slice(0, 40);

  const txnVolume = comps.filter((c) => c.compType === "same_area" || c.compType === "same_building" || c.compType === "same_project").length;

  if (selected.length === 0) {
    return {
      fairPsf: null,
      estimatedValueAed: null,
      estimatedValueLow: null,
      estimatedValueHigh: null,
      medianBuildingPsf: null,
      medianAreaPsf: null,
      comps: [],
      compCount: 0,
      confidence: 0,
      txnVolume,
    };
  }

  // Outlier-trim PSF then take weighted median.
  const psfValues = selected.map((c) => c.pricePerSqft);
  const trimmed = removeOutliers(psfValues);
  const trimmedSet = new Set(trimmed);
  const kept = selected.filter((c) => trimmedSet.has(c.pricePerSqft));
  const usable = kept.length >= 3 ? kept : selected;

  const fairPsf = weightedMedian(usable.map((c) => ({ value: c.pricePerSqft, weight: c.weight })));
  const lowPsf = percentile(usable.map((c) => c.pricePerSqft), 25);
  const highPsf = percentile(usable.map((c) => c.pricePerSqft), 75);

  const size = listing.sizeSqft;
  const estimatedValueAed = fairPsf != null && size != null ? Math.round((fairPsf * size) / 1000) * 1000 : null;
  const estimatedValueLow = lowPsf != null && size != null ? Math.round((lowPsf * size) / 1000) * 1000 : null;
  const estimatedValueHigh = highPsf != null && size != null ? Math.round((highPsf * size) / 1000) * 1000 : null;

  const buildingComps = byTier("same_building");
  const areaComps = byTier("same_area").concat(buildingComps, byTier("same_project"));
  const medianBuildingPsf = buildingComps.length ? percentile(buildingComps.map((c) => c.pricePerSqft), 50) : null;
  const medianAreaPsf = areaComps.length ? percentile(areaComps.map((c) => c.pricePerSqft), 50) : null;

  // Confidence: more (and closer, fresher, more similar) comps → higher.
  const avgSimilarity = usable.reduce((s, c) => s + c.similarityScore, 0) / usable.length;
  const avgRecencyDays = usable.reduce((s, c) => s + c.recencyDays, 0) / usable.length;
  const tierBonus = buildingComps.length >= 2 ? 0.25 : byTier("same_project").length ? 0.12 : 0.0;
  const countFactor = Math.min(1, usable.length / 12);
  const recencyFactor = Math.max(0.2, Math.pow(0.5, avgRecencyDays / 365));
  const sizeKnownFactor = size != null ? 1 : 0.4;
  let confidence = (0.45 * countFactor + 0.3 * avgSimilarity + 0.25 * recencyFactor + tierBonus) * sizeKnownFactor;
  confidence = Math.max(0, Math.min(1, confidence));

  return {
    fairPsf,
    estimatedValueAed,
    estimatedValueLow,
    estimatedValueHigh,
    medianBuildingPsf,
    medianAreaPsf,
    comps: selected.sort((a, b) => b.weight - a.weight),
    compCount: usable.length,
    confidence,
    txnVolume,
  };
}
