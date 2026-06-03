import { getRepository } from "@/lib/repo";
import { ok, parseListingQuery } from "@/lib/api";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const repo = await getRepository();
  const url = new URL(req.url);
  const query = parseListingQuery(url.searchParams);
  const result = await repo.getListings(query);
  return ok({ ...result, backend: repo.backend, isSampleData: repo.isSampleData });
}
