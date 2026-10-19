import { getRepository } from "@/lib/repo";
import { fail, ok } from "@/lib/api";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const repo = await getRepository();
  const listing = await repo.getListing(params.id);
  if (!listing) return fail("Listing not found", 404);
  return ok(listing);
}
