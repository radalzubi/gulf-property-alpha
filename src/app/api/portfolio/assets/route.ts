import { getRepository } from "@/lib/repo";
import { DEFAULT_USER_ID, fail, ok } from "@/lib/api";
import { z } from "zod";

export const dynamic = "force-dynamic";

const assetSchema = z.object({
  userId: z.string().optional(),
  assetName: z.string().min(1),
  listingId: z.string().optional(),
  status: z.enum(["Owned", "Planned", "Watch", "Hypothetical", "Sold", "Off-Plan"]).optional(),
  emirate: z.string().optional(),
  areaId: z.string().optional(),
  buildingOrProject: z.string().optional(),
  developerId: z.string().optional(),
  propertyType: z.string().optional(),
  sizeSqft: z.number().optional(),
  purchasePriceAed: z.number().optional(),
  acquisitionDate: z.string().optional(),
  currentEstimatedValueAed: z.number().optional(),
  annualRentAed: z.number().optional(),
  occupancyStatus: z.string().optional(),
  leaseStart: z.string().optional(),
  leaseEnd: z.string().optional(),
  mortgageBalanceAed: z.number().optional(),
  interestRate: z.number().optional(),
  monthlyPaymentAed: z.number().optional(),
  serviceChargesAed: z.number().optional(),
  maintenanceAed: z.number().optional(),
  managementFeeAed: z.number().optional(),
  insuranceAed: z.number().optional(),
  otherExpensesAed: z.number().optional(),
  notes: z.string().optional(),
});

export async function POST(req: Request) {
  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return fail("Invalid JSON body");
  }
  const parsed = assetSchema.safeParse(json);
  if (!parsed.success) return fail(parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join(", "));
  const repo = await getRepository();
  const { userId, ...rest } = parsed.data;
  const created = await repo.addPortfolioAsset(userId ?? DEFAULT_USER_ID, rest as never);
  return ok(created, { status: 201 });
}
