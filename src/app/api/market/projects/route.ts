import { getRepository } from "@/lib/repo";
import { ok } from "@/lib/api";

export const dynamic = "force-dynamic";

export async function GET() {
  const repo = await getRepository();
  return ok(await repo.getProjects());
}
