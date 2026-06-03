import * as React from "react";
import { Tag, Tooltip } from "@/components/ui";
import { cn, fmtAge } from "@/lib/utils";
import { dealScoreTone } from "@/lib/scoring";
import {
  SOURCE_CLASS_LABEL,
  SOURCE_CLASS_TONE,
  confidenceBucket,
  type ProvenanceEntry,
  type SourceClass,
} from "@/lib/provenance";
import type { RiskLabel } from "@/types/domain";

const DOT: Record<string, string> = {
  good: "bg-signal-good",
  caution: "bg-signal-caution",
  risk: "bg-signal-risk",
  official: "bg-signal-official",
  inferred: "bg-signal-inferred",
  missing: "bg-signal-missing",
  neutral: "bg-terminal-muted",
};

/** Clean score chip: a number with a quiet colored dot. */
export function DealScoreBadge({ score, showLabel = true }: { score: number; showLabel?: boolean }) {
  const tone = dealScoreTone(score);
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-terminal-border bg-terminal-panel px-2 py-0.5 text-xs text-terminal-textHi">
      <span className={cn("h-1.5 w-1.5 rounded-full", DOT[tone])} />
      {showLabel && <span className="text-terminal-muted">Score</span>}
      <span className="font-semibold tnum">{Math.round(score)}</span>
    </span>
  );
}

export function ConfidenceBadge({ confidence }: { confidence: number | null | undefined }) {
  const { label, tone } = confidenceBucket(confidence);
  const pct = confidence != null ? `${Math.round(confidence * 100)}%` : "—";
  return (
    <Tooltip content={`Confidence in this data: ${label} (${pct})`}>
      <span className="inline-flex items-center gap-1.5 text-2xs text-terminal-muted">
        <span className={cn("h-1.5 w-1.5 rounded-full", DOT[tone])} />
        {label} confidence
      </span>
    </Tooltip>
  );
}

const RISK_TONE: Record<RiskLabel, "good" | "caution" | "risk"> = {
  Low: "good",
  Moderate: "caution",
  Elevated: "caution",
  High: "risk",
};

export function RiskBadge({ risk }: { risk: RiskLabel }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-2xs text-terminal-muted">
      <span className={cn("h-1.5 w-1.5 rounded-full", DOT[RISK_TONE[risk]])} />
      {risk.toLowerCase()} risk
    </span>
  );
}

export function SourceBadge({ sourceClass, sourceId }: { sourceClass: SourceClass; sourceId?: string }) {
  return (
    <Tooltip content={`${SOURCE_CLASS_LABEL[sourceClass]}${sourceId ? ` · ${sourceId}` : ""}`}>
      <span className="inline-flex items-center gap-1.5 text-2xs text-terminal-muted">
        <span className={cn("h-1.5 w-1.5 rounded-full", DOT[SOURCE_CLASS_TONE[sourceClass]])} />
        {SOURCE_CLASS_LABEL[sourceClass]}
      </span>
    </Tooltip>
  );
}

export function TimestampBadge({ at, prefix = "Updated" }: { at: string | Date | null | undefined; prefix?: string }) {
  return (
    <span className="text-2xs text-terminal-muted">
      {prefix} {fmtAge(at)}
    </span>
  );
}

export function SampleBadge() {
  return (
    <Tooltip content="Sample data — illustrative, not a live market feed. Never mixed with real data.">
      <Tag tone="inferred">Sample</Tag>
    </Tooltip>
  );
}

/**
 * Field-level provenance: a value followed by a small, quiet dot whose tooltip
 * explains where the value came from, confidence and when it was observed.
 */
export function ProvenanceValue({
  value,
  entry,
  className,
}: {
  value: React.ReactNode;
  entry?: ProvenanceEntry;
  className?: string;
}) {
  const e = entry;
  const unavailable = !e || e.sourceClass === "unavailable";
  const tone = e ? SOURCE_CLASS_TONE[e.sourceClass] : "missing";
  return (
    <span className={className}>
      <span className={unavailable ? "text-terminal-muted" : "text-terminal-textHi"}>{unavailable ? "Not available" : value}</span>{" "}
      {e && (
        <Tooltip
          content={[
            `Source: ${SOURCE_CLASS_LABEL[e.sourceClass]}`,
            e.sourceId ? `Connector: ${e.sourceId}` : null,
            e.confidence != null ? `Confidence: ${Math.round(e.confidence * 100)}%` : null,
            e.observedAt ? `Observed: ${fmtAge(e.observedAt)}` : null,
            e.method ? `Method: ${e.method}` : null,
            e.notes ? `Note: ${e.notes}` : null,
          ]
            .filter(Boolean)
            .join("\n")}
        >
          <span className={cn("ml-0.5 inline-block h-1.5 w-1.5 cursor-help rounded-full align-middle", DOT[tone])} />
        </Tooltip>
      )}
    </span>
  );
}
