import { getRepository } from "@/lib/repo";
import { fail, ok } from "@/lib/api";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const repo = await getRepository();
  const score = await repo.getListingScore(params.id);
  if (!score) return fail("Score not found", 404);
  return ok(score);
}
