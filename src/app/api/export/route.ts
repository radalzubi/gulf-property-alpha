import { getRepository } from "@/lib/repo";
import { parseListingQuery } from "@/lib/api";

export const dynamic = "force-dynamic";

function csvCell(v: unknown): string {
  if (v == null) return "";
  const s = String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** GET /api/export?type=listings → CSV download of the (filtered) listings. */
export async function GET(req: Request) {
  const repo = await getRepository();
  const url = new URL(req.url);
  const type = url.searchParams.get("type") ?? "listings";
  if (type !== "listings") {
    return new Response("Unsupported export type", { status: 400 });
  }
  const query = parseListingQuery(url.searchParams);
  query.limit = 10000;
  const { items } = await repo.getListings(query);

  const headers = [
    "id", "source", "title", "emirate", "area", "neighborhood", "building", "project", "developer",
    "propertyType", "beds", "baths", "sizeSqft", "priceAed", "pricePerSqft", "estMarketValueAed",
    "valueGapPct", "estAnnualRentAed", "grossYieldPct", "netYieldPct", "downPaymentPct", "hasPaymentPlan",
    "serviceChargePsf", "agent", "agency", "phone", "listedAt", "lastRefreshedAt", "status",
    "dealScore", "confidence", "riskLabel", "isSample",
  ];
  const rows = items.map((l) => [
    l.id, l.sourceId, l.title, l.emirate, l.areaName, l.neighborhood, l.buildingName, l.projectName, l.developerName,
    l.propertyType, l.bedrooms, l.bathrooms, l.sizeSqft, l.askingPriceAed, l.pricePerSqft, l.score.estimatedMarketValueAed,
    l.score.valueGapPercent, l.score.estimatedAnnualRentAed, l.score.estimatedGrossYield?.toFixed(1),
    l.score.estimatedNetYield?.toFixed(1), l.paymentPlan?.downPaymentPercent ?? "", l.hasPaymentPlan,
    l.serviceChargePsf ?? "", l.agentName ?? "", l.agencyName ?? "", l.publicPhone ?? "", l.listedAt, l.lastRefreshedAt,
    l.status, l.score.totalDealScore, l.score.overallConfidence.toFixed(2), l.score.riskLabel, l.isSample,
  ]);
  const csv = [headers.join(","), ...rows.map((r) => r.map(csvCell).join(","))].join("\n");

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="gulf-property-alpha-listings.csv"`,
    },
  });
}
