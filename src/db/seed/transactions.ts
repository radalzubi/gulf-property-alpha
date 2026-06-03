import type { GovTransaction, GovRent, PropertyType } from "@/types/domain";
import { SAMPLE_AREAS } from "./areas";
import { BUILDINGS_BY_AREA } from "./buildings";
import { makeRng, SEED_NOW } from "./prng";

/** Typical size (sqft) by bedroom band for apartments; villas scaled up. */
function typicalSize(bedrooms: number, isVilla: boolean): [number, number] {
  if (isVilla) {
    const base = 1800 + bedrooms * 700;
    return [base * 0.85, base * 1.2];
  }
  switch (bedrooms) {
    case 0:
      return [380, 520]; // studio
    case 1:
      return [620, 880];
    case 2:
      return [980, 1350];
    case 3:
      return [1450, 1950];
    default:
      return [2000, 2900];
  }
}

/**
 * Generates SAMPLE government transactions around each area's median PSF.
 * Deterministic (seeded). These are labeled is_sample and are NOT real DLD rows.
 */
export function generateTransactions(): GovTransaction[] {
  const out: GovTransaction[] = [];
  let n = 0;
  for (const area of SAMPLE_AREAS) {
    const rng = makeRng(hash(area.id) + 7);
    const buildings = BUILDINGS_BY_AREA[area.id] ?? [area.name + " Tower"];
    const medianPsf = area.medianSalePsf ?? 1200;
    const count = 55 + rng.int(0, 25);
    for (let i = 0; i < count; i++) {
      const isVilla = rng.bool(area.id.includes("yas") ? 0.25 : 0.08);
      const propertyType: PropertyType = isVilla ? "Villa" : "Apartment";
      const bedrooms = isVilla ? rng.int(3, 5) : rng.int(0, 3);
      const [loSz, hiSz] = typicalSize(bedrooms, isVilla);
      const sizeSqft = Math.round(rng.range(loSz, hiSz));
      // PSF drifts down slightly the further back in time (appreciation trend).
      const monthsBack = rng.int(0, 17);
      const trend = 1 - (area.annualPriceChangePct ?? 8) / 100 / 12 * monthsBack;
      const psf = Math.round(medianPsf * trend * rng.range(0.82, 1.2));
      const priceAed = Math.round((psf * sizeSqft) / 1000) * 1000;
      out.push({
        id: `txn-${++n}`,
        sourceId: "dld_open_data",
        emirate: area.emirate,
        transactionDate: new Date(SEED_NOW.getTime() - monthsBack * 30 * 86_400_000 - rng.int(0, 29) * 86_400_000).toISOString(),
        areaId: area.id,
        buildingName: rng.pick(buildings),
        propertyType,
        transactionType: "Sale",
        readyState: rng.bool(0.7) ? "Ready" : "Off-Plan",
        priceAed,
        sizeSqft,
        pricePerSqft: psf,
        bedrooms,
        officialReference: `SAMPLE-DLD-${area.emirate === "Dubai" ? "DXB" : "AUH"}-${100000 + n}`,
        isSample: true,
      });
    }
  }
  return out;
}

/** Generates SAMPLE government rent contracts around each area's median rent PSF. */
export function generateRents(): GovRent[] {
  const out: GovRent[] = [];
  let n = 0;
  for (const area of SAMPLE_AREAS) {
    const rng = makeRng(hash(area.id) + 31);
    const buildings = BUILDINGS_BY_AREA[area.id] ?? [area.name + " Tower"];
    const medianRentPsf = area.medianRentPsf ?? 90;
    const count = 45 + rng.int(0, 20);
    for (let i = 0; i < count; i++) {
      const isVilla = rng.bool(area.id.includes("yas") ? 0.2 : 0.06);
      const propertyType: PropertyType = isVilla ? "Villa" : "Apartment";
      const bedrooms = isVilla ? rng.int(3, 5) : rng.int(0, 3);
      const [loSz, hiSz] = typicalSize(bedrooms, isVilla);
      const sizeSqft = Math.round(rng.range(loSz, hiSz));
      const monthsBack = rng.int(0, 14);
      const trend = 1 - (area.annualRentChangePct ?? 8) / 100 / 12 * monthsBack;
      const rentPsf = Math.round(medianRentPsf * trend * rng.range(0.85, 1.15));
      const annualRentAed = Math.round((rentPsf * sizeSqft) / 500) * 500;
      out.push({
        id: `rent-${++n}`,
        sourceId: "dld_open_data",
        emirate: area.emirate,
        rentDate: new Date(SEED_NOW.getTime() - monthsBack * 30 * 86_400_000 - rng.int(0, 29) * 86_400_000).toISOString(),
        areaId: area.id,
        buildingName: rng.pick(buildings),
        propertyType,
        annualRentAed,
        sizeSqft,
        rentPerSqft: rentPsf,
        bedrooms,
        contractType: rng.bool(0.6) ? "Renewal" : "New",
        isSample: true,
      });
    }
  }
  return out;
}

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
