/**
 * Deterministic PRNG so SAMPLE data (and tests) are reproducible.
 * mulberry32 — small, fast, seeded.
 */
export function makeRng(seed: number) {
  let a = seed >>> 0;
  const next = () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return {
    next,
    /** float in [min, max) */
    range: (min: number, max: number) => min + next() * (max - min),
    /** int in [min, max] inclusive */
    int: (min: number, max: number) => Math.floor(min + next() * (max - min + 1)),
    pick: <T>(arr: T[]): T => arr[Math.floor(next() * arr.length)],
    /** gaussian-ish via averaging, centered at mu with spread sigma */
    gauss: (mu: number, sigma: number) => {
      const r = (next() + next() + next() + next() - 2) / 2; // ~[-1,1]
      return mu + r * sigma;
    },
    bool: (p = 0.5) => next() < p,
  };
}

/** Fixed reference "now" for sample timestamps — keeps the dataset deterministic. */
export const SEED_NOW = new Date("2026-06-01T08:00:00.000Z");

export function daysAgo(days: number, ref: Date = SEED_NOW): string {
  return new Date(ref.getTime() - days * 86_400_000).toISOString();
}

export function monthsAgo(months: number, ref: Date = SEED_NOW): string {
  const d = new Date(ref);
  d.setMonth(d.getMonth() - months);
  return d.toISOString();
}

export function monthsAhead(months: number, ref: Date = SEED_NOW): string {
  const d = new Date(ref);
  d.setMonth(d.getMonth() + months);
  return d.toISOString();
}
