import { fail, ok } from "@/lib/api";
import { ADAPTER_BY_ID, ADAPTERS } from "@/ingestion/adapters";
import { runAdapter } from "@/ingestion/core/runner";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  let body: { sourceId?: string } = {};
  try {
    body = await req.json();
  } catch {
    /* allow empty body → run all */
  }
  if (body.sourceId) {
    const adapter = ADAPTER_BY_ID.get(body.sourceId);
    if (!adapter) return fail(`Unknown source: ${body.sourceId}`, 404);
    return ok(await runAdapter(adapter));
  }
  // Run all configured/sample adapters sequentially (respects per-source locks).
  const results = [];
  for (const a of ADAPTERS) results.push(await runAdapter(a));
  return ok({ status: "ok", message: `Ran ${results.length} connectors`, results });
}
