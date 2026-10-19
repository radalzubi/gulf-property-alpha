import { getRepository } from "@/lib/repo";
import { ok } from "@/lib/api";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const repo = await getRepository();
  const comps = await repo.getListingComps(params.id);
  return ok(comps);
}
