import { getRepository } from "@/lib/repo";
import { PageShell } from "@/components/PageShell";
import { Panel, PanelHeader, Stat, DataTable, Tag } from "@/components/ui";
import { confidenceBucket } from "@/lib/provenance";
import { fmtPct, fmtNum, fmtAge } from "@/lib/utils";

export const dynamic = "force-dynamic";

const STATUS_TONE: Record<string, "good" | "caution" | "risk" | "missing"> = { ok: "good", degraded: "caution", failing: "risk", not_configured: "missing", disabled: "missing" };

export default async function DataQualityPage() {
  const repo = await getRepository();
  const [sources, listingsResult] = await Promise.all([repo.getSourceHealth(), repo.getListings({ limit: 500, hideDuplicates: false })]);
  const listings = listingsResult.items;

  const total = listings.length;
  const dupes = listings.filter((l) => l.isDuplicate).length;
  const stale = listings.filter((l) => l.status === "stale").length;
  const noSize = listings.filter((l) => l.sizeSqft == null).length;
  const buckets = { High: 0, Medium: 0, Low: 0, Unknown: 0 };
  for (const l of listings) buckets[confidenceBucket(l.score.overallConfidence).label]++;

  return (
    <PageShell title="Data Quality / Source Health" subtitle="Connector health, freshness, completeness and confidence">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-6">
        <Stat label="Listings tracked" value={total} />
        <Stat label="High confidence" value={buckets.High} tone="good" />
        <Stat label="Low/unknown conf." value={buckets.Low + buckets.Unknown} tone={buckets.Low + buckets.Unknown > 0 ? "caution" : undefined} />
        <Stat label="Duplicates" value={dupes} tone={dupes ? "caution" : undefined} />
        <Stat label="Stale" value={stale} tone={stale ? "caution" : undefined} />
        <Stat label="Missing size" value={noSize} tone={noSize ? "caution" : undefined} />
      </div>

      <Panel>
        <PanelHeader title="Source health" subtitle="Per-connector status, freshness & quality stats" />
        <DataTable>
          <thead><tr><th>Source</th><th>Type</th><th>Class</th><th>Status</th><th>Refresh</th><th>Last success</th><th>Pulled</th><th>Changed</th><th>Rejected</th><th>Dup rate</th><th>Match rate</th><th>Missing-field</th><th>Conf. contrib.</th></tr></thead>
          <tbody>
            {sources.map((s) => (
              <tr key={s.id}>
                <td className="font-medium text-terminal-textHi">{s.name}</td>
                <td>{s.sourceType}</td>
                <td>{s.isOfficial ? <Tag tone="official">official</Tag> : <Tag tone="neutral">{s.sourceClass.replace(/_/g, " ")}</Tag>}</td>
                <td><Tag tone={STATUS_TONE[s.status] ?? "neutral"}>{s.status.replace(/_/g, " ")}</Tag></td>
                <td>{s.refreshFrequencyMinutes != null ? `${s.refreshFrequencyMinutes}m` : "on demand"}</td>
                <td className="text-terminal-muted">{s.lastSuccessAt ? fmtAge(s.lastSuccessAt) : "—"}</td>
                <td>{s.recordsPulled != null ? fmtNum(s.recordsPulled) : "—"}</td>
                <td>{s.recordsChanged != null ? fmtNum(s.recordsChanged) : "—"}</td>
                <td>{s.recordsRejected != null ? fmtNum(s.recordsRejected) : "—"}</td>
                <td>{s.duplicateRate != null ? fmtPct(s.duplicateRate * 100) : "—"}</td>
                <td>{s.matchRate != null ? fmtPct(s.matchRate * 100) : "—"}</td>
                <td>{s.missingFieldRate != null ? fmtPct(s.missingFieldRate * 100) : "—"}</td>
                <td>{s.confidenceContribution != null ? fmtPct(s.confidenceContribution * 100) : "—"}</td>
              </tr>
            ))}
          </tbody>
        </DataTable>
      </Panel>

      <Panel>
        <PanelHeader title="Per-listing data quality" subtitle="Confidence, completeness and risk flags" />
        <DataTable className="max-h-[60vh]">
          <thead><tr><th>Listing</th><th>Source</th><th>Confidence</th><th>Comps</th><th>Rent comps</th><th>Size</th><th>Service charge</th><th>Duplicate</th><th>Stale</th></tr></thead>
          <tbody>
            {listings.map((l) => {
              const cb = confidenceBucket(l.score.overallConfidence);
              return (
                <tr key={l.id}>
                  <td className="text-terminal-text">{l.title}</td>
                  <td>{l.sourceId}</td>
                  <td><Tag tone={cb.tone}>{cb.label} · {Math.round(l.score.overallConfidence * 100)}%</Tag></td>
                  <td>{l.score.compCount}</td>
                  <td>{l.score.rentCompCount}</td>
                  <td>{l.sizeSqft != null ? "✓" : <span className="text-signal-caution">missing</span>}</td>
                  <td>{l.fieldProvenance?.serviceChargePsf?.sourceClass === "unavailable" ? <span className="text-signal-caution">assumed</span> : "✓"}</td>
                  <td>{l.isDuplicate ? <span className="text-signal-caution">dup</span> : "—"}</td>
                  <td>{l.status === "stale" ? <span className="text-signal-caution">stale</span> : "—"}</td>
                </tr>
              );
            })}
          </tbody>
        </DataTable>
      </Panel>
    </PageShell>
  );
}
