import { getRepository } from "@/lib/repo";
import { DEFAULT_USER_ID, ok } from "@/lib/api";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const repo = await getRepository();
  const userId = new URL(req.url).searchParams.get("userId") ?? DEFAULT_USER_ID;
  return ok(await repo.getWatchlists(userId));
}
