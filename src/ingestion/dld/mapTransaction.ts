import { slugify, toSqft } from "@/lib/utils";
import { SAMPLE_AREAS } from "@/db/seed/areas";

/**
 * Shared DLD transaction normalization, used by BOTH the live Dubai Pulse API
 * adapter and the scheduled Kaggle-mirror ingest. DLD's CSV/API column names
 * vary by source/version, so `pick()` accepts multiple aliases.
 */
export interface MappedTxn {
  id: string;
  date: Date;
  areaId: string;
  emirate: "Dubai" | "Abu Dhabi";
  buildingName?: string;
  projectName?: string;
  propertyType: string;
  readyState: string;
  priceAed: number;
  sizeSqft: number;
  pricePerSqft: number;
  bedrooms: number | null;
  officialReference?: string;
}

const AREA_MATCH = SAMPLE_AREAS.map((a) => ({
  id: a.id,
  emirate: a.emirate,
  needle: a.name.toLowerCase().replace(/\(.*\)/, "").trim(),
}));

function matchArea(name: string): { areaId: string; emirate: "Dubai" | "Abu Dhabi" } {
  const lc = (name || "").toLowerCase();
  for (const a of AREA_MATCH) {
    if (a.needle && (lc.includes(a.needle) || a.needle.includes(lc))) {
      return { areaId: a.id, emirate: a.emirate as "Dubai" | "Abu Dhabi" };
    }
  }
  return { areaId: `dxb-${slugify(name || "unknown")}`, emirate: "Dubai" };
}

const pick = (row: Record<string, unknown>, keys: string[]): string | undefined => {
  for (const k of keys) {
    const found = Object.keys(row).find((rk) => rk.toLowerCase() === k.toLowerCase());
    if (found && row[found] != null && String(row[found]).trim() !== "") return String(row[found]).trim();
  }
  return undefined;
};

function parseBedrooms(rooms?: string): number | null {
  if (!rooms) return null;
  const r = rooms.toLowerCase();
  if (r.includes("studio")) return 0;
  const m = r.match(/(\d+)/);
  return m ? Number(m[1]) : null;
}

function hash(s: string): string {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(36);
}

/** Map one raw DLD row → normalized transaction, or null if unusable. */
export function mapDldRow(row: Record<string, unknown>): MappedTxn | null {
  const dateStr = pick(row, ["instance_date", "transaction_date", "date", "procedure_date"]);
  const areaName = pick(row, ["area_name_en", "area_name", "area", "master_project_en"]) ?? "";
  const priceStr = pick(row, ["actual_worth", "amount", "price", "trans_value", "meter_sale_price"]);
  const areaSqm = pick(row, ["procedure_area", "size", "area_sqm", "actual_area"]);
  if (!priceStr || !areaSqm || !dateStr) return null;

  const price = Number(priceStr.replace(/[, ]/g, ""));
  const sqm = Number(areaSqm.replace(/[, ]/g, ""));
  if (!Number.isFinite(price) || price <= 0 || !Number.isFinite(sqm) || sqm <= 0) return null;
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return null;

  const sizeSqft = Math.round(toSqft(sqm));
  const pricePerSqft = Math.round(price / sizeSqft);
  const { areaId, emirate } = matchArea(areaName);
  const propertyType = (pick(row, ["property_type_en", "property_type", "prop_type_en"]) ?? "Apartment").includes("Villa") ? "Villa" : "Apartment";
  const regType = pick(row, ["reg_type_en", "registration_type"]) ?? "";
  const readyState = /off|plan/i.test(regType) ? "Off-Plan" : "Ready";
  const ref = pick(row, ["transaction_id", "procedure_id", "trans_id"]);
  const id = `dld-${ref ?? hash(`${dateStr}|${areaName}|${price}|${sqm}`)}`;

  return {
    id,
    date,
    areaId,
    emirate,
    buildingName: pick(row, ["building_name_en", "building_name"]),
    projectName: pick(row, ["project_name_en", "master_project_en", "project_name"]),
    propertyType,
    readyState,
    priceAed: Math.round(price),
    sizeSqft,
    pricePerSqft,
    bedrooms: parseBedrooms(pick(row, ["rooms_en", "rooms", "no_of_rooms"])),
    officialReference: ref,
  };
}

/** Idempotently upsert normalized transactions into Postgres (batched). */
export async function upsertTransactions(mapped: MappedTxn[], sourceId = "dld_open_data"): Promise<number> {
  if (!process.env.DATABASE_URL || mapped.length === 0) return 0;
  const { getDb } = await import("@/db/client");
  const t = await import("@/db/schema");
  const db = getDb();
  let inserted = 0;
  const CHUNK = 1000;
  for (let i = 0; i < mapped.length; i += CHUNK) {
    const batch = mapped.slice(i, i + CHUNK).map((m) => ({
      id: m.id,
      sourceId,
      emirate: m.emirate,
      transactionDate: m.date,
      areaId: m.areaId,
      projectName: m.projectName,
      buildingName: m.buildingName,
      propertyType: m.propertyType,
      transactionType: "Sale",
      readyState: m.readyState,
      priceAed: String(m.priceAed),
      sizeSqft: String(m.sizeSqft),
      pricePerSqft: String(m.pricePerSqft),
      bedrooms: m.bedrooms,
      officialReference: m.officialReference,
      isSample: false,
    }));
    const res = await db.insert(t.governmentTransactions).values(batch as never).onConflictDoNothing();
    inserted += (res as { count?: number }).count ?? batch.length;
  }
  return inserted;
}
