/**
 * Provenance is a first-class concern in Gulf Property Alpha.
 *
 * PRINCIPLE: never pretend a field is known if it is not available, and never
 * fabricate data. Every meaningful value carries WHERE it came from, WHEN it was
 * observed, HOW confident we are, and HOW it was derived.
 */

export const SOURCE_CLASSES = [
  "source_provided", // raw from an originating system, class not further refined
  "government_verified", // DLD / ADREC / official registries
  "portal_provided", // Property Finder / Bayut / Dubizzle authorized feeds
  "broker_developer_provided", // broker CRM / developer inventory feeds
  "model_inferred", // estimated/derived by our models (must be labeled)
  "user_entered", // typed by the user (portfolio, notes, manual import)
  "unavailable", // genuinely not known — shown as such, never guessed
] as const;

export type SourceClass = (typeof SOURCE_CLASSES)[number];

export const SOURCE_CLASS_LABEL: Record<SourceClass, string> = {
  source_provided: "Source",
  government_verified: "Gov-verified",
  portal_provided: "Portal",
  broker_developer_provided: "Broker/Dev",
  model_inferred: "Model-inferred",
  user_entered: "User-entered",
  unavailable: "Unavailable",
};

/** Maps to the color language in tailwind.config.ts. */
export const SOURCE_CLASS_TONE: Record<SourceClass, "good" | "caution" | "risk" | "official" | "inferred" | "missing" | "neutral"> = {
  source_provided: "neutral",
  government_verified: "official",
  portal_provided: "neutral",
  broker_developer_provided: "caution",
  model_inferred: "inferred",
  user_entered: "neutral",
  unavailable: "missing",
};

export interface ProvenanceEntry {
  sourceClass: SourceClass;
  /** Reference to a `sources` row / connector id (e.g. "dld_open_data"). */
  sourceId?: string;
  /** 0..1 — how confident we are in THIS field's value. */
  confidence?: number;
  /** ISO timestamp the value was observed/derived. */
  observedAt?: string;
  /** Short human description of derivation method. */
  method?: string;
  notes?: string;
}

/** field name → provenance entry */
export type FieldProvenance = Record<string, ProvenanceEntry>;

export function prov(
  sourceClass: SourceClass,
  extra: Omit<ProvenanceEntry, "sourceClass"> = {},
): ProvenanceEntry {
  return { sourceClass, ...extra };
}

export const UNAVAILABLE: ProvenanceEntry = { sourceClass: "unavailable", confidence: 0 };

/** Confidence label buckets used by ConfidenceBadge. */
export function confidenceBucket(c: number | null | undefined): {
  label: "High" | "Medium" | "Low" | "Unknown";
  tone: "good" | "caution" | "risk" | "missing";
} {
  if (c == null) return { label: "Unknown", tone: "missing" };
  if (c >= 0.75) return { label: "High", tone: "good" };
  if (c >= 0.45) return { label: "Medium", tone: "caution" };
  if (c > 0) return { label: "Low", tone: "risk" };
  return { label: "Unknown", tone: "missing" };
}

/** Field completeness ratio for a set of expected fields. */
export function completeness(fp: FieldProvenance | undefined, expectedFields: string[]): number {
  if (!fp || expectedFields.length === 0) return 0;
  const known = expectedFields.filter((f) => fp[f] && fp[f].sourceClass !== "unavailable").length;
  return known / expectedFields.length;
}
