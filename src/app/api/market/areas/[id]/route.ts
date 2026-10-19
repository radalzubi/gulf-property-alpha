import { getRepository } from "@/lib/repo";
import { fail, ok } from "@/lib/api";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const repo = await getRepository();
  const detail = await repo.getAreaDetail(params.id);
  if (!detail) return fail("Area not found", 404);
  return ok(detail);
}
