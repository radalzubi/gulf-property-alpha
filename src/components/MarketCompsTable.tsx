import type { Comp } from "@/types/domain";
import { DataTable, Tag } from "@/components/ui";
import { fmtAED, fmtNum } from "@/lib/utils";

const TIER_LABEL: Record<Comp["compType"], { label: string; tone: "good" | "official" | "caution" | "neutral" }> = {
  same_building: { label: "Same building", tone: "good" },
  same_project: { label: "Same project", tone: "official" },
  same_area: { label: "Same area", tone: "neutral" },
  neighborhood: { label: "Neighborhood", tone: "caution" },
};

export function MarketCompsTable({ comps }: { comps: Comp[] }) {
  if (comps.length === 0) return <p className="px-4 py-6 text-2xs text-terminal-muted">No comparable transactions found.</p>;
  return (
    <DataTable className="max-h-80">
      <thead>
        <tr>
          <th>Tier</th><th>AED/sqft</th><th>Price</th><th>Size</th><th>Beds</th><th>Age</th><th>Similarity</th>
        </tr>
      </thead>
      <tbody>
        {comps.map((c) => {
          const t = TIER_LABEL[c.compType];
          return (
            <tr key={c.compTransactionId}>
              <td><Tag tone={t.tone}>{t.label}</Tag></td>
              <td className="font-semibold text-terminal-textHi">{fmtNum(c.pricePerSqft)}</td>
              <td>{fmtAED(c.priceAed, { compact: true })}</td>
              <td>{fmtNum(c.sizeSqft)} sqft</td>
              <td>{c.bedrooms === 0 ? "Studio" : c.bedrooms ?? "—"}</td>
              <td className="text-terminal-muted">{c.recencyDays}d</td>
              <td>{Math.round(c.similarityScore * 100)}%</td>
            </tr>
          );
        })}
      </tbody>
    </DataTable>
  );
}
