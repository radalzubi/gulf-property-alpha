import type { GovRent, Listing } from "@/types/domain";
import { percentile, removeOutliers, weightedMedian } from "@/lib/utils";

export interface RentEstimate {
  annualRentAed: number | null;
  annualRentLow: number | null;
  annualRentHigh: number | null;
  rentPsf: number | null;
  /** 0..1 */
  confidence: number;
  compCount: number;
  /** tenant-demand proxy 0..100 from comp density + contract mix */
  demandScore: number;
}

const RECENCY_HALF_LIFE_DAYS = 200;

/**
 * Rent estimate, prioritizing official rent records (here SAMPLE gov rents):
 * same building → same area → neighborhood, recency/similarity weighted.
 */
export function estimateRent(
  listing: Listing,
  rents: GovRent[],
  opts: { now?: Date; areaMedianRentPsf?: number } = {},
): RentEstimate {
  const now = opts.now ?? new Date();
  const sameEmirate = rents.filter((r) => r.emirate === listing.emirate);

  const scored = sameEmirate.map((r) => {
    let tierWeight = 0.3; // neighborhood
    if (r.areaId === listing.areaId && listing.buildingName && r.buildingName === listing.buildingName) tierWeight = 1.0;
    else if (r.areaId === listing.areaId) tierWeight = 0.6;

    const recencyDays = Math.max(0, (now.getTime() - new Date(r.rentDate).getTime()) / 86_400_000);
    const recencyFactor = Math.pow(0.5, recencyDays / RECENCY_HALF_LIFE_DAYS);
    const sameBeds = listing.bedrooms != null && r.bedrooms === listing.bedrooms;
    const bedroomFactor = sameBeds ? 1 : listing.bedrooms != null && r.bedrooms != null ? 1 / (1 + Math.abs(r.bedrooms - listing.bedrooms)) : 0.6;
    const typeFactor = r.propertyType === listing.propertyType ? 1 : 0.4;
    const weight = tierWeight * recencyFactor * bedroomFactor * typeFactor;
    return { r, weight, recencyDays, sameBeds };
  });

  // Keep the most relevant comps.
  const top = scored.filter((s) => s.weight > 0.02).sort((a, b) => b.weight - a.weight).slice(0, 40);

  if (top.length === 0) {
    // Fall back to area median rent PSF if provided (clearly lower confidence).
    if (opts.areaMedianRentPsf && listing.sizeSqft) {
      const annual = Math.round((opts.areaMedianRentPsf * listing.sizeSqft) / 500) * 500;
      return {
        annualRentAed: annual,
        annualRentLow: Math.round(annual * 0.88),
        annualRentHigh: Math.round(annual * 1.12),
        rentPsf: opts.areaMedianRentPsf,
        confidence: 0.3,
        compCount: 0,
        demandScore: 55,
      };
    }
    return { annualRentAed: null, annualRentLow: null, annualRentHigh: null, rentPsf: null, confidence: 0, compCount: 0, demandScore: 40 };
  }

  const psfTrim = removeOutliers(top.map((s) => s.r.rentPerSqft));
  const trimSet = new Set(psfTrim);
  const usable = top.filter((s) => trimSet.has(s.r.rentPerSqft));
  const use = usable.length >= 3 ? usable : top;

  const rentPsf = weightedMedian(use.map((s) => ({ value: s.r.rentPerSqft, weight: s.weight })));
  const lowPsf = percentile(use.map((s) => s.r.rentPerSqft), 25);
  const highPsf = percentile(use.map((s) => s.r.rentPerSqft), 75);

  const size = listing.sizeSqft;
  const annualRentAed = rentPsf != null && size != null ? Math.round((rentPsf * size) / 500) * 500 : null;
  const annualRentLow = lowPsf != null && size != null ? Math.round((lowPsf * size) / 500) * 500 : null;
  const annualRentHigh = highPsf != null && size != null ? Math.round((highPsf * size) / 500) * 500 : null;

  const avgRecency = use.reduce((s, x) => s + x.recencyDays, 0) / use.length;
  const countFactor = Math.min(1, use.length / 10);
  const recencyFactor = Math.max(0.2, Math.pow(0.5, avgRecency / 365));
  const sizeKnownFactor = size != null ? 1 : 0.35;
  const confidence = Math.max(0, Math.min(1, (0.5 * countFactor + 0.5 * recencyFactor) * sizeKnownFactor));

  const renewalShare = use.filter((s) => s.r.contractType === "Renewal").length / use.length;
  const demandScore = Math.round(Math.min(100, 40 + countFactor * 40 + renewalShare * 20));

  return { annualRentAed, annualRentLow, annualRentHigh, rentPsf, confidence, compCount: use.length, demandScore };
}
