import { ok } from "@/lib/api";
import { getJobs } from "@/ingestion/core/runner";

export const dynamic = "force-dynamic";

export async function GET() {
  return ok(getJobs());
}
