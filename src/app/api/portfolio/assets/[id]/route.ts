import { getRepository } from "@/lib/repo";
import { fail, ok } from "@/lib/api";

export const dynamic = "force-dynamic";

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return fail("Invalid JSON body");
  }
  const repo = await getRepository();
  const updated = await repo.updatePortfolioAsset(params.id, json as never);
  if (!updated) return fail("Asset not found", 404);
  return ok(updated);
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const repo = await getRepository();
  const deleted = await repo.deletePortfolioAsset(params.id);
  if (!deleted) return fail("Asset not found", 404);
  return ok({ deleted: true });
}
