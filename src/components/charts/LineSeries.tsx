"use client";

import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, AreaChart, Area } from "recharts";

export function LineSeries({
  data,
  xKey,
  yKey,
  height = 200,
  color = "#111111",
  area = false,
  format = "number",
}: {
  data: Record<string, unknown>[];
  xKey: string;
  yKey: string;
  height?: number;
  color?: string;
  area?: boolean;
  /** Serializable format hint (functions can't cross the server→client boundary). */
  format?: "number" | "currency" | "psf";
}) {
  const fmt = (v: number) =>
    format === "currency"
      ? `AED ${Math.round(v).toLocaleString()}`
      : format === "psf"
        ? `${Math.round(v).toLocaleString()}/sqft`
        : Math.round(v).toLocaleString();
  const axis = { stroke: "#9aa1ab", fontSize: 10 };
  const grid = <CartesianGrid stroke="#eceef1" strokeDasharray="3 3" />;
  const tip = (
    <Tooltip
      contentStyle={{ background: "#ffffff", border: "1px solid #e6e8eb", borderRadius: 10, fontSize: 11 }}
      labelStyle={{ color: "#6b7280" }}
      itemStyle={{ color: "#0a0a0a" }}
      formatter={(v: number) => fmt(v)}
    />
  );
  if (data.length === 0) return <div className="flex h-[120px] items-center justify-center text-2xs text-terminal-muted">No series data</div>;
  return (
    <ResponsiveContainer width="100%" height={height}>
      {area ? (
        <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id={`g-${yKey}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.35} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          {grid}
          <XAxis dataKey={xKey} {...axis} tickLine={false} />
          <YAxis {...axis} tickLine={false} width={48} tickFormatter={(v) => fmt(Number(v))} />
          {tip}
          <Area type="monotone" dataKey={yKey} stroke={color} fill={`url(#g-${yKey})`} strokeWidth={2} />
        </AreaChart>
      ) : (
        <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
          {grid}
          <XAxis dataKey={xKey} {...axis} tickLine={false} />
          <YAxis {...axis} tickLine={false} width={48} tickFormatter={(v) => fmt(Number(v))} />
          {tip}
          <Line type="monotone" dataKey={yKey} stroke={color} strokeWidth={2} dot={false} />
        </LineChart>
      )}
    </ResponsiveContainer>
  );
}
