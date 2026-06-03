import Papa from "papaparse";

export type ImportType = "listings" | "transactions" | "rents" | "portfolio";

export interface ImportReport {
  accepted: number;
  rejected: number;
  errors: string[];
  preview: Record<string, unknown>[];
  rows: Record<string, unknown>[]; // mapped, accepted rows
}

/** Lowercased header → canonical field. Accepts common variants. */
const ALIASES: Record<string, string> = {
  title: "title", name: "title", listing: "title", assetname: "assetName", asset: "assetName",
  emirate: "emirate", city: "emirate",
  area: "area", neighborhood: "area", community: "area", location: "area",
  building: "building", buildingname: "building", tower: "building",
  developer: "developer",
  type: "propertyType", propertytype: "propertyType", unittype: "propertyType",
  beds: "bedrooms", bedrooms: "bedrooms", br: "bedrooms",
  baths: "bathrooms", bathrooms: "bathrooms",
  size: "sizeSqft", sizesqft: "sizeSqft", area_sqft: "sizeSqft", builtuparea: "sizeSqft",
  price: "priceAed", priceaed: "priceAed", askingprice: "priceAed", amount: "priceAed",
  purchaseprice: "purchasePriceAed", purchasepriceaed: "purchasePriceAed",
  rent: "annualRentAed", annualrent: "annualRentAed", annualrentaed: "annualRentAed",
  servicecharge: "serviceChargePsf", servicechargepsf: "serviceChargePsf",
  date: "date", transactiondate: "date", rentdate: "date", contractdate: "date",
  ready: "readyState", status: "readyState",
};

const REQUIRED: Record<ImportType, string[]> = {
  listings: ["emirate", "area", "priceAed"],
  transactions: ["emirate", "area", "priceAed", "sizeSqft"],
  rents: ["emirate", "area", "annualRentAed", "sizeSqft"],
  portfolio: ["assetName", "purchasePriceAed"],
};

const NUMERIC = new Set(["bedrooms", "bathrooms", "sizeSqft", "priceAed", "purchasePriceAed", "annualRentAed", "serviceChargePsf"]);

function canonicalize(row: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(row)) {
    const key = ALIASES[k.toLowerCase().replace(/[\s_-]/g, "")] ?? ALIASES[k.toLowerCase()] ?? k;
    out[key] = typeof v === "string" ? v.trim() : v;
  }
  for (const n of NUMERIC) {
    if (out[n] != null && out[n] !== "") {
      const num = Number(String(out[n]).replace(/[, AED]/gi, ""));
      out[n] = Number.isFinite(num) ? num : out[n];
    }
  }
  return out;
}

/** Parse + validate + map a CSV string for the given import type. Never throws. */
export function importCsv(type: ImportType, csv: string): ImportReport {
  const errors: string[] = [];
  const parsed = Papa.parse(csv, { header: true, skipEmptyLines: true });
  if (parsed.errors.length) errors.push(`${parsed.errors.length} CSV parse warning(s): ${parsed.errors[0]?.message ?? ""}`);
  const required = REQUIRED[type];
  const rawRows = (parsed.data as Record<string, unknown>[]).filter((r) => Object.keys(r).length > 0);

  const rows: Record<string, unknown>[] = [];
  let rejected = 0;
  rawRows.forEach((raw, i) => {
    const row = canonicalize(raw);
    const missing = required.filter((f) => row[f] == null || row[f] === "");
    // numeric sanity
    const badNum = required.filter((f) => NUMERIC.has(f) && typeof row[f] !== "number");
    if (missing.length || badNum.length) {
      rejected++;
      if (errors.length < 12) errors.push(`Row ${i + 2}: ${[...missing.map((m) => `missing ${m}`), ...badNum.map((b) => `non-numeric ${b}`)].join(", ")}`);
      return;
    }
    rows.push({ ...row, _source: "manual_upload", _sourceClass: "user_entered" });
  });

  return { accepted: rows.length, rejected, errors, preview: rows.slice(0, 5), rows };
}
