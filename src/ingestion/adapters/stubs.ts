import type { SourceClass } from "@/lib/provenance";
import type { SourceType } from "@/types/domain";
import { type Adapter, type IngestionResult, now, result } from "../core/adapter";
import { buildSampleDataset } from "@/db/seed";

/**
 * Connector stubs for sources that require authorized credentials/feeds.
 * They never throw or crash — they report `not_configured` with setup steps.
 * No scraping is performed anywhere.
 */
function stub(opts: {
  id: string;
  name: string;
  sourceType: SourceType;
  sourceClass: SourceClass;
  isOfficial: boolean;
  refreshFrequencyMinutes: number | null;
  envKeys: string[];
  instructions: string;
}): Adapter {
  return {
    id: opts.id,
    name: opts.name,
    sourceType: opts.sourceType,
    sourceClass: opts.sourceClass,
    isOfficial: opts.isOfficial,
    refreshFrequencyMinutes: opts.refreshFrequencyMinutes,
    validateCredentials() {
      const configured = opts.envKeys.every((k) => !!process.env[k]);
      return configured ? { configured: true } : { configured: false, instructions: opts.instructions };
    },
    async run(): Promise<IngestionResult> {
      const startedAt = now();
      const cfg = this.validateCredentials();
      if (!cfg.configured) return result(opts.id, "not_configured", cfg.instructions!, startedAt);
      // With credentials present, a real implementation would fetch the authorized feed here.
      return result(opts.id, "ok", "Credentials detected — connect the authorized feed implementation to begin ingesting.", startedAt);
    },
  };
}

/** Sample feed adapters reflect the current SAMPLE listing counts for that source. */
function sampleFeed(id: string, name: string, sourceClass: SourceClass, sourceType: SourceType, refresh: number): Adapter {
  return {
    id,
    name,
    sourceType,
    sourceClass,
    isOfficial: false,
    refreshFrequencyMinutes: refresh,
    validateCredentials() {
      return { configured: true };
    },
    async run(): Promise<IngestionResult> {
      const startedAt = now();
      const ds = buildSampleDataset();
      const count = ds.listings.filter((l) => l.sourceId === id).length;
      return result(id, "ok", `SAMPLE feed: ${count} listings present and scored. Labeled ${sourceClass.replace(/_/g, " ")}.`, startedAt, {
        recordsSeen: count,
        recordsUpdated: count,
      });
    },
  };
}

export const STUB_ADAPTERS: Adapter[] = [
  stub({ id: "property_finder", name: "Property Finder feed", sourceType: "portal", sourceClass: "portal_provided", isOfficial: false, refreshFrequencyMinutes: 5, envKeys: ["PROPERTY_FINDER_API_KEY", "PROPERTY_FINDER_FEED_URL"], instructions: "Set PROPERTY_FINDER_API_KEY and PROPERTY_FINDER_FEED_URL (authorized feed only — no scraping)." }),
  stub({ id: "bayut", name: "Bayut feed", sourceType: "portal", sourceClass: "portal_provided", isOfficial: false, refreshFrequencyMinutes: 5, envKeys: ["BAYUT_API_KEY", "BAYUT_FEED_URL"], instructions: "Set BAYUT_API_KEY and BAYUT_FEED_URL (authorized feed only)." }),
  stub({ id: "dubizzle", name: "Dubizzle feed", sourceType: "portal", sourceClass: "portal_provided", isOfficial: false, refreshFrequencyMinutes: 5, envKeys: ["DUBIZZLE_API_KEY", "DUBIZZLE_FEED_URL"], instructions: "Set DUBIZZLE_API_KEY and DUBIZZLE_FEED_URL (authorized feed only)." }),
  stub({ id: "dld_gateway", name: "DLD API Gateway", sourceType: "official", sourceClass: "government_verified", isOfficial: true, refreshFrequencyMinutes: 60, envKeys: ["DLD_GATEWAY_API_KEY"], instructions: "Set DLD_GATEWAY_API_KEY (requires an authorized DLD integration agreement)." }),
  stub({ id: "dubai_rest", name: "Dubai REST", sourceType: "official", sourceClass: "government_verified", isOfficial: true, refreshFrequencyMinutes: 60, envKeys: ["DUBAI_REST_API_KEY"], instructions: "Set DUBAI_REST_API_KEY where authorized." }),
  stub({ id: "adrec", name: "ADREC market data", sourceType: "official", sourceClass: "government_verified", isOfficial: true, refreshFrequencyMinutes: 1440, envKeys: ["ADREC_API_KEY"], instructions: "Set ADREC_API_KEY where available. Abu Dhabi coverage is thinner than Dubai." }),
  stub({ id: "adrec_rent_index", name: "Abu Dhabi Rental Index", sourceType: "official", sourceClass: "government_verified", isOfficial: true, refreshFrequencyMinutes: 1440, envKeys: ["ADREC_API_KEY"], instructions: "Configure ADREC access. Update cadence is periodic, not minute-level." }),
  stub({ id: "dari", name: "DARI ecosystem", sourceType: "official", sourceClass: "government_verified", isOfficial: true, refreshFrequencyMinutes: 1440, envKeys: ["DARI_API_KEY"], instructions: "Set DARI_API_KEY where authorized." }),
];

export const SAMPLE_FEED_ADAPTERS: Adapter[] = [
  sampleFeed("broker_csv", "Broker CRM CSV/XML feed", "broker_developer_provided", "broker", 15),
  sampleFeed("developer_inventory", "Developer inventory feed", "broker_developer_provided", "developer", 15),
];

export const MANUAL_UPLOAD_ADAPTER: Adapter = {
  id: "manual_upload",
  name: "Manual CSV / Excel upload",
  sourceType: "user",
  sourceClass: "user_entered",
  isOfficial: false,
  refreshFrequencyMinutes: null,
  validateCredentials() {
    return { configured: true };
  },
  async run(): Promise<IngestionResult> {
    return result("manual_upload", "ok", "Use the CSV/Excel import panel to upload listings, transactions, rents or portfolio rows (labeled user-entered).", now());
  },
};
