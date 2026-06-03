import { fail, ok, DEFAULT_USER_ID } from "@/lib/api";
import { getRepository } from "@/lib/repo";
import { importCsv, type ImportType } from "@/ingestion/importers/csv";

export const dynamic = "force-dynamic";

const VALID: ImportType[] = ["listings", "transactions", "rents", "portfolio"];

export async function POST(req: Request, { params }: { params: { type: string } }) {
  const type = params.type as ImportType;
  if (!VALID.includes(type)) return fail(`Unsupported import type: ${type}`, 400);
  const dryRun = new URL(req.url).searchParams.get("dryRun") !== "false";

  let body: { csv?: string } = {};
  try {
    body = await req.json();
  } catch {
    return fail("Invalid JSON body");
  }
  if (!body.csv || !body.csv.trim()) return fail("Empty CSV");

  const report = importCsv(type, body.csv);

  // On a real (non-dry-run) import we persist user-entered rows.
  // Portfolio rows persist through the repository in any backend; listings/
  // transactions/rents persistence requires the Postgres backend — in the
  // memory backend we validate + report but do not mutate the sample dataset
  // (sample and user data are never silently mixed).
  if (!dryRun && type === "portfolio" && report.rows.length) {
    const repo = await getRepository();
    for (const r of report.rows) {
      await repo.addPortfolioAsset(DEFAULT_USER_ID, {
        assetName: String(r.assetName ?? "Imported asset"),
        emirate: (r.emirate as never) ?? "Dubai",
        areaId: "dxb-dubai-marina",
        buildingOrProject: r.building as string | undefined,
        propertyType: (r.propertyType as never) ?? "Apartment",
        sizeSqft: Number(r.sizeSqft ?? 0),
        purchasePriceAed: Number(r.purchasePriceAed ?? 0),
        currentEstimatedValueAed: Number(r.purchasePriceAed ?? 0),
        annualRentAed: Number(r.annualRentAed ?? 0),
      });
    }
  }

  return ok({
    accepted: report.accepted,
    rejected: report.rejected,
    errors: report.errors,
    preview: report.preview,
    persisted: !dryRun && type === "portfolio" ? report.rows.length : 0,
    note: dryRun
      ? "Dry run — nothing persisted."
      : type === "portfolio"
        ? "Portfolio rows persisted (user-entered)."
        : "Validated. Listings/transactions/rents persist with the Postgres backend; not mixed into SAMPLE data.",
  });
}
