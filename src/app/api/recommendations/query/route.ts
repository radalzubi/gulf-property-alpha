import { getRepository } from "@/lib/repo";
import { fail, ok } from "@/lib/api";
import { z } from "zod";

export const dynamic = "force-dynamic";

const weightsSchema = z
  .object({
    priceDiscount: z.number(),
    netYield: z.number(),
    rentDemand: z.number(),
    liquidity: z.number(),
    areaMomentum: z.number(),
    developerQuality: z.number(),
    paymentPlan: z.number(),
    risk: z.number(),
    dataConfidence: z.number(),
  })
  .partial()
  .optional();

const bodySchema = z.object({
  profileId: z.string().optional(),
  weights: weightsSchema,
  filters: z.record(z.unknown()).optional(),
  limit: z.number().int().positive().max(200).optional(),
});

export async function POST(req: Request) {
  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return fail("Invalid JSON body");
  }
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) return fail(parsed.error.issues.map((i) => i.message).join(", "));

  const repo = await getRepository();
  const { profileId, weights, filters, limit } = parsed.data;
  // Fill any missing weight keys with neutral 10 so partial weight sets work.
  const fullWeights = weights
    ? {
        priceDiscount: weights.priceDiscount ?? 0,
        netYield: weights.netYield ?? 0,
        rentDemand: weights.rentDemand ?? 0,
        liquidity: weights.liquidity ?? 0,
        areaMomentum: weights.areaMomentum ?? 0,
        developerQuality: weights.developerQuality ?? 0,
        paymentPlan: weights.paymentPlan ?? 0,
        risk: weights.risk ?? 0,
        dataConfidence: weights.dataConfidence ?? 0,
      }
    : undefined;
  const recs = await repo.getRecommendations({ profileId, weights: fullWeights, filters: filters as never, limit });
  return ok(recs);
}
