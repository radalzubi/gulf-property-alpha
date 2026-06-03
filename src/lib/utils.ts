import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const SQFT_PER_SQM = 10.7639;

export const toSqm = (sqft: number) => sqft / SQFT_PER_SQM;
export const toSqft = (sqm: number) => sqm * SQFT_PER_SQM;

/** AED currency, compact for large numbers. */
export function fmtAED(value: number | null | undefined, opts?: { compact?: boolean; decimals?: number }) {
  if (value == null || Number.isNaN(value)) return "—";
  const { compact = false, decimals = 0 } = opts ?? {};
  if (compact && Math.abs(value) >= 1_000_000) return `AED ${(value / 1_000_000).toFixed(2)}M`;
  if (compact && Math.abs(value) >= 1_000) return `AED ${(value / 1_000).toFixed(0)}K`;
  return `AED ${value.toLocaleString("en-AE", { maximumFractionDigits: decimals })}`;
}

export function fmtNum(value: number | null | undefined, decimals = 0) {
  if (value == null || Number.isNaN(value)) return "—";
  return value.toLocaleString("en-AE", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

export function fmtPct(value: number | null | undefined, decimals = 1) {
  if (value == null || Number.isNaN(value)) return "—";
  return `${value.toFixed(decimals)}%`;
}

/** Signed percent for premium/discount (positive = premium/up). */
export function fmtSignedPct(value: number | null | undefined, decimals = 1) {
  if (value == null || Number.isNaN(value)) return "—";
  const s = value > 0 ? "+" : "";
  return `${s}${value.toFixed(decimals)}%`;
}

export function fmtDate(d: string | Date | null | undefined) {
  if (!d) return "—";
  const date = typeof d === "string" ? new Date(d) : d;
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-AE", { year: "numeric", month: "short", day: "numeric" });
}

/** Human "x days/hours ago" against a fixed reference (defaults now). */
export function fmtAge(d: string | Date | null | undefined, ref: Date = new Date()) {
  if (!d) return "—";
  const date = typeof d === "string" ? new Date(d) : d;
  const diffMs = ref.getTime() - date.getTime();
  if (diffMs < 0) return "just now";
  const mins = Math.floor(diffMs / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  return `${months}mo ago`;
}

export const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));

/** Weighted median of {value, weight} pairs. */
export function weightedMedian(items: { value: number; weight: number }[]): number | null {
  const arr = items.filter((i) => Number.isFinite(i.value) && i.weight > 0).sort((a, b) => a.value - b.value);
  if (arr.length === 0) return null;
  const total = arr.reduce((s, i) => s + i.weight, 0);
  let acc = 0;
  for (const i of arr) {
    acc += i.weight;
    if (acc >= total / 2) return i.value;
  }
  return arr[arr.length - 1].value;
}

export function percentile(values: number[], p: number): number | null {
  const arr = values.filter(Number.isFinite).sort((a, b) => a - b);
  if (arr.length === 0) return null;
  const idx = clamp((p / 100) * (arr.length - 1), 0, arr.length - 1);
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  if (lo === hi) return arr[lo];
  return arr[lo] + (arr[hi] - arr[lo]) * (idx - lo);
}

export const median = (values: number[]) => percentile(values, 50);

/** Remove outliers outside [Q1 - k·IQR, Q3 + k·IQR]. */
export function removeOutliers(values: number[], k = 1.5): number[] {
  if (values.length < 4) return values;
  const q1 = percentile(values, 25)!;
  const q3 = percentile(values, 75)!;
  const iqr = q3 - q1;
  return values.filter((v) => v >= q1 - k * iqr && v <= q3 + k * iqr);
}

export function slugify(s: string) {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
