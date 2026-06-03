import { NextResponse } from "next/server";
import type { ListingQuery } from "@/lib/repo/types";

export const DEFAULT_USER_ID = "00000000-0000-0000-0000-000000000001";

export function ok<T>(data: T, init?: ResponseInit) {
  return NextResponse.json({ ok: true, data }, init);
}

export function fail(message: string, status = 400) {
  return NextResponse.json({ ok: false, error: message }, { status });
}

const num = (v: string | null): number | undefined => (v == null || v === "" ? undefined : Number(v));
const bool = (v: string | null): boolean | undefined => (v == null ? undefined : v === "true" || v === "1");
const str = (v: string | null): string | undefined => (v == null || v === "" ? undefined : v);

/** Parses URL search params into a typed ListingQuery. */
export function parseListingQuery(sp: URLSearchParams): ListingQuery {
  return {
    q: str(sp.get("q")),
    emirate: str(sp.get("emirate")),
    areaId: str(sp.get("areaId")),
    developerId: str(sp.get("developerId")),
    projectId: str(sp.get("projectId")),
    propertyType: str(sp.get("propertyType")),
    readyState: str(sp.get("readyState")),
    tenure: str(sp.get("tenure")),
    furnishing: str(sp.get("furnishing")),
    occupancy: str(sp.get("occupancy")),
    source: str(sp.get("source")),
    status: str(sp.get("status")),
    bedrooms: num(sp.get("bedrooms")),
    minPrice: num(sp.get("minPrice")),
    maxPrice: num(sp.get("maxPrice")),
    minPsf: num(sp.get("minPsf")),
    maxPsf: num(sp.get("maxPsf")),
    minSize: num(sp.get("minSize")),
    maxSize: num(sp.get("maxSize")),
    minNetYield: num(sp.get("minNetYield")),
    maxDownPaymentPct: num(sp.get("maxDownPaymentPct")),
    minDealScore: num(sp.get("minDealScore")),
    minConfidence: num(sp.get("minConfidence")),
    riskLabel: str(sp.get("riskLabel")),
    hasPaymentPlan: bool(sp.get("hasPaymentPlan")),
    hideLowQuality: bool(sp.get("hideLowQuality")),
    hideDuplicates: bool(sp.get("hideDuplicates")),
    sortBy: str(sp.get("sortBy")),
    sortDir: (str(sp.get("sortDir")) as "asc" | "desc") ?? undefined,
    limit: num(sp.get("limit")),
    offset: num(sp.get("offset")),
  };
}
