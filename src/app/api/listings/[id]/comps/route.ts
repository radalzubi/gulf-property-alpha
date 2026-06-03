import { getRepository } from "@/lib/repo";
import { ok } from "@/lib/api";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const repo = await getRepository();
  const comps = await repo.getListingComps(params.id);
  return ok(comps);
}
