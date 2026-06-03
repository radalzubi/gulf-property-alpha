"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import type { DataSource } from "@/types/domain";
import { apiGet, apiSend } from "@/lib/client";
import { Panel, PanelHeader, Button, Tag, Select, Field } from "@/components/ui";
import { Play, Upload, RefreshCw } from "lucide-react";

const STATUS_TONE: Record<string, "good" | "caution" | "risk" | "missing"> = { ok: "good", degraded: "caution", failing: "risk", not_configured: "missing", disabled: "missing" };

export function AdminConsole() {
  const sources = useQuery({ queryKey: ["sources"], queryFn: () => apiGet<DataSource[]>("/api/sources/health") });
  const [runLog, setRunLog] = React.useState<string[]>([]);
  const [running, setRunning] = React.useState<string | null>(null);

  const run = async (sourceId: string) => {
    setRunning(sourceId);
    try {
      const res = await apiSend<{ status: string; message: string; recordsSeen?: number; recordsInserted?: number }>("/api/ingestion/run", "POST", { sourceId });
      setRunLog((l) => [`[${new Date().toLocaleTimeString()}] ${sourceId}: ${res.status} — ${res.message}` , ...l].slice(0, 12));
    } catch (e) {
      setRunLog((l) => [`[error] ${sourceId}: ${(e as Error).message}`, ...l]);
    } finally {
      setRunning(null);
      sources.refetch();
    }
  };

  return (
    <div className="space-y-4">
      <Panel>
        <PanelHeader title="Data connectors" subtitle="Government, portal, broker/developer & user sources" right={<Button size="sm" variant="ghost" onClick={() => sources.refetch()}><RefreshCw className="h-3 w-3" /> Refresh</Button>} />
        <div className="divide-y divide-terminal-border">
          {(sources.data ?? []).map((s) => (
            <div key={s.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-terminal-textHi">{s.name}</span>
                  <Tag tone={STATUS_TONE[s.status] ?? "neutral"}>{s.status.replace(/_/g, " ")}</Tag>
                  {s.isOfficial && <Tag tone="official">official</Tag>}
                </div>
                <p className="mt-0.5 text-2xs text-terminal-muted">{s.notes}</p>
                {s.status === "not_configured" && s.setupInstructions && (
                  <p className="mt-1 text-2xs text-signal-caution">Setup: {s.setupInstructions}</p>
                )}
              </div>
              <Button size="sm" variant="default" disabled={running === s.id} onClick={() => run(s.id)}>
                <Play className="h-3 w-3" /> {running === s.id ? "Running…" : "Run now"}
              </Button>
            </div>
          ))}
        </div>
      </Panel>

      {runLog.length > 0 && (
        <Panel className="p-3">
          <div className="mb-1 text-2xs font-semibold uppercase tracking-wider text-terminal-muted">Ingestion log</div>
          <pre className="max-h-40 overflow-auto whitespace-pre-wrap text-2xs text-terminal-text">{runLog.join("\n")}</pre>
        </Panel>
      )}

      <CsvImport />
    </div>
  );
}

function CsvImport() {
  const [type, setType] = React.useState("listings");
  const [text, setText] = React.useState("");
  const [result, setResult] = React.useState<{ accepted: number; rejected: number; errors: string[]; preview: Record<string, unknown>[] } | null>(null);
  const [busy, setBusy] = React.useState(false);

  const submit = async (dryRun: boolean) => {
    setBusy(true);
    try {
      const res = await apiSend<{ accepted: number; rejected: number; errors: string[]; preview: Record<string, unknown>[] }>(`/api/import/${type}?dryRun=${dryRun}`, "POST", { csv: text });
      setResult(res);
    } catch (e) {
      setResult({ accepted: 0, rejected: 0, errors: [(e as Error).message], preview: [] });
    } finally {
      setBusy(false);
    }
  };

  const sampleHeaders: Record<string, string> = {
    listings: "title,emirate,area,building,propertyType,bedrooms,sizeSqft,priceAed,serviceChargePsf",
    transactions: "emirate,area,building,propertyType,bedrooms,sizeSqft,priceAed,transactionDate",
    rents: "emirate,area,building,propertyType,bedrooms,sizeSqft,annualRentAed,rentDate",
    portfolio: "assetName,emirate,area,propertyType,sizeSqft,purchasePriceAed,annualRentAed",
  };

  return (
    <Panel>
      <PanelHeader title="CSV / Excel import" subtitle="User-provided data (labeled user-entered). Preview before import — sample data is never overwritten." />
      <div className="space-y-2 p-4">
        <div className="flex flex-wrap items-end gap-2">
          <Field label="Import type" className="w-48">
            <Select value={type} onChange={(e) => { setType(e.target.value); setResult(null); }}>
              <option value="listings">Listings</option>
              <option value="transactions">Transactions</option>
              <option value="rents">Rents</option>
              <option value="portfolio">Portfolio assets</option>
            </Select>
          </Field>
          <Button size="sm" variant="default" disabled={busy || !text.trim()} onClick={() => submit(true)}>Preview</Button>
          <Button size="sm" variant="primary" disabled={busy || !text.trim()} onClick={() => submit(false)}><Upload className="h-3 w-3" /> Import</Button>
        </div>
        <p className="text-2xs text-terminal-muted">Expected headers: <code className="text-terminal-text">{sampleHeaders[type]}</code></p>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={`Paste CSV with header row…\n${sampleHeaders[type]}`}
          className="h-40 w-full rounded-md border border-terminal-border bg-terminal-bg p-2 font-mono text-2xs text-terminal-text focus:border-accent/60 focus:outline-none"
        />
        {result && (
          <div className="rounded border border-terminal-border bg-terminal-panel2 p-2 text-2xs">
            <div className="flex gap-3">
              <span className="text-signal-good">Accepted: {result.accepted}</span>
              <span className={result.rejected ? "text-signal-risk" : "text-terminal-muted"}>Rejected: {result.rejected}</span>
            </div>
            {result.errors.length > 0 && <ul className="mt-1 space-y-0.5 text-signal-caution">{result.errors.slice(0, 8).map((e, i) => <li key={i}>• {e}</li>)}</ul>}
            {result.preview.length > 0 && <pre className="mt-1 max-h-32 overflow-auto text-terminal-muted">{JSON.stringify(result.preview.slice(0, 3), null, 1)}</pre>}
          </div>
        )}
      </div>
    </Panel>
  );
}
