import type { SourceClass } from "@/lib/provenance";
import type { SourceType } from "@/types/domain";

export type AdapterStatus = "ok" | "degraded" | "failing" | "not_configured";

export interface IngestionResult {
  sourceId: string;
  status: AdapterStatus;
  message: string;
  recordsSeen: number;
  recordsInserted: number;
  recordsUpdated: number;
  recordsRejected: number;
  startedAt: string;
  finishedAt: string;
  error?: string;
}

/**
 * Every data connector implements this interface. Adapters MUST NOT throw on
 * missing credentials — they report `not_configured` with setup instructions so
 * the dashboard never breaks.
 */
export interface Adapter {
  id: string;
  name: string;
  sourceType: SourceType;
  sourceClass: SourceClass;
  isOfficial: boolean;
  refreshFrequencyMinutes: number | null;
  /** Returns whether credentials/config are present and, if not, how to set them. */
  validateCredentials(): { configured: boolean; instructions?: string };
  /** Fetch → normalize → (persist) → return a job result. Never throws. */
  run(): Promise<IngestionResult>;
}

export function now() {
  return new Date().toISOString();
}

/** Helper to build a result quickly. */
export function result(
  sourceId: string,
  status: AdapterStatus,
  message: string,
  startedAt: string,
  counts: Partial<Pick<IngestionResult, "recordsSeen" | "recordsInserted" | "recordsUpdated" | "recordsRejected">> = {},
  error?: string,
): IngestionResult {
  return {
    sourceId,
    status,
    message,
    recordsSeen: counts.recordsSeen ?? 0,
    recordsInserted: counts.recordsInserted ?? 0,
    recordsUpdated: counts.recordsUpdated ?? 0,
    recordsRejected: counts.recordsRejected ?? 0,
    startedAt,
    finishedAt: now(),
    error,
  };
}
