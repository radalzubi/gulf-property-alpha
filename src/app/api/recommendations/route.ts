import { getRepository } from "@/lib/repo";
import { ok, parseListingQuery } from "@/lib/api";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const repo = await getRepository();
  const url = new URL(req.url);
  const profileId = url.searchParams.get("profile") ?? undefined;
  const limit = url.searchParams.get("limit") ? Number(url.searchParams.get("limit")) : undefined;
  const filters = parseListingQuery(url.searchParams);
  const recs = await repo.getRecommendations({ profileId, filters, limit });
  return ok(recs);
}
