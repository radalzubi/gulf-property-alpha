"use client";

import * as React from "react";
import type { ScoringWeights } from "@/types/domain";
import { Button } from "@/components/ui";
import { RotateCcw } from "lucide-react";

const FIELDS: { key: keyof ScoringWeights; label: string }[] = [
  { key: "priceDiscount", label: "Price discount" },
  { key: "netYield", label: "Net yield" },
  { key: "rentDemand", label: "Rent / tenant demand" },
  { key: "liquidity", label: "Liquidity" },
  { key: "areaMomentum", label: "Area momentum" },
  { key: "developerQuality", label: "Developer quality" },
  { key: "paymentPlan", label: "Payment plan" },
  { key: "risk", label: "Risk adjustment" },
  { key: "dataConfidence", label: "Data confidence" },
];

export function RecommendationWeightSliders({
  weights,
  onChange,
  onReset,
}: {
  weights: ScoringWeights;
  onChange: (w: ScoringWeights) => void;
  onReset: () => void;
}) {
  const total = FIELDS.reduce((s, f) => s + (weights[f.key] || 0), 0);
  return (
    <div className="panel p-3">
      <div className="mb-2 flex items-center justify-between">
        <div className="text-2xs font-semibold uppercase tracking-wider text-terminal-muted">Recommendation weights</div>
        <Button size="sm" variant="ghost" onClick={onReset}>
          <RotateCcw className="h-3 w-3" /> Reset
        </Button>
      </div>
      <div className="grid grid-cols-1 gap-x-5 gap-y-2 sm:grid-cols-3">
        {FIELDS.map((f) => {
          const pct = total > 0 ? Math.round(((weights[f.key] || 0) / total) * 100) : 0;
          return (
            <div key={f.key}>
              <div className="flex items-center justify-between text-2xs">
                <span className="text-terminal-text">{f.label}</span>
                <span className="tnum font-mono text-terminal-muted">{pct}%</span>
              </div>
              <input
                type="range"
                min={0}
                max={40}
                step={1}
                value={weights[f.key]}
                onChange={(e) => onChange({ ...weights, [f.key]: Number(e.target.value) })}
                className="mt-1 h-1 w-full cursor-pointer appearance-none rounded-full bg-terminal-border accent-accent"
              />
            </div>
          );
        })}
      </div>
      <p className="mt-2 text-2xs text-terminal-muted">Weights are normalized to 100%. Adjust to re-rank recommendations live.</p>
    </div>
  );
}
