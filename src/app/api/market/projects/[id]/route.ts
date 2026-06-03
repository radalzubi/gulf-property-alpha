import { getRepository } from "@/lib/repo";
import { fail, ok } from "@/lib/api";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const repo = await getRepository();
  const detail = await repo.getProjectDetail(params.id);
  if (!detail) return fail("Project not found", 404);
  return ok(detail);
}
