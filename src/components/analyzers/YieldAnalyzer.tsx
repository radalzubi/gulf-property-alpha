"use client";

import * as React from "react";
import { useSearchParams } from "next/navigation";
import type { ScoredListing } from "@/types/domain";
import { apiGet } from "@/lib/client";
import { Panel, PanelHeader, Field, Input, Stat, Button } from "@/components/ui";
import { amortizationSchedule, breakEvenOccupancy, dscr, irr, monthlyMortgagePayment, paybackPeriodYears } from "@/lib/finance";
import { fmtAED, fmtPct } from "@/lib/utils";

interface Inputs {
  purchasePrice: number;
  sizeSqft: number;
  expectedRent: number;
  serviceChargePsf: number;
  maintenancePct: number;
  managementPct: number;
  vacancyPct: number;
  insurance: number;
  mortgageAmount: number;
  interestRate: number;
  loanTenure: number;
  transferPct: number;
  brokerPct: number;
  furnishing: number;
  renovation: number;
  rentGrowth: number;
  priceGrowth: number;
  holdingPeriod: number;
}

const DEFAULTS: Inputs = {
  purchasePrice: 1500000, sizeSqft: 900, expectedRent: 105000, serviceChargePsf: 16,
  maintenancePct: 5, managementPct: 5, vacancyPct: 6, insurance: 800,
  mortgageAmount: 0, interestRate: 4.5, loanTenure: 25, transferPct: 4, brokerPct: 2,
  furnishing: 0, renovation: 0, rentGrowth: 5, priceGrowth: 6, holdingPeriod: 5,
};

function analyze(i: Inputs) {
  const grossRent = i.expectedRent;
  const serviceCharge = i.serviceChargePsf * i.sizeSqft;
  const vacancyCost = grossRent * (i.vacancyPct / 100);
  const management = grossRent * (i.managementPct / 100);
  const maintenance = grossRent * (i.maintenancePct / 100);
  const opex = serviceCharge + management + maintenance + i.insurance;
  const noi = grossRent - vacancyCost - opex;
  const allIn = i.purchasePrice * (1 + i.transferPct / 100 + i.brokerPct / 100) + i.furnishing + i.renovation;
  const equity = Math.max(1, allIn - i.mortgageAmount);
  const monthlyPay = monthlyMortgagePayment(i.mortgageAmount, i.interestRate, i.loanTenure);
  const annualDebt = monthlyPay * 12;
  const annualCF = noi - annualDebt;

  const grossYield = (grossRent / i.purchasePrice) * 100;
  const netYield = (noi / allIn) * 100;
  const cashOnCash = (annualCF / equity) * 100;
  const ltv = (i.mortgageAmount / i.purchasePrice) * 100;
  const dscrVal = dscr(noi, annualDebt);
  const breakEven = breakEvenOccupancy(grossRent, opex, annualDebt);
  const payback = paybackPeriodYears(equity, annualCF);

  // IRR (levered & unlevered) over holding period
  const N = Math.max(1, Math.round(i.holdingPeriod));
  const sched = i.mortgageAmount > 0 ? amortizationSchedule(i.mortgageAmount, i.interestRate, i.loanTenure) : [];
  const balanceAt = (year: number) => (sched.length ? sched[Math.min(sched.length - 1, year * 12 - 1)]?.balance ?? 0 : 0);
  const exitValue = i.purchasePrice * Math.pow(1 + i.priceGrowth / 100, N) * 0.98; // 2% selling cost

  const unlevered: number[] = [-allIn];
  const levered: number[] = [-equity];
  for (let y = 1; y <= N; y++) {
    const noiY = noi * Math.pow(1 + i.rentGrowth / 100, y - 1);
    const cfY = noiY - annualDebt;
    const isLast = y === N;
    unlevered.push(noiY + (isLast ? exitValue : 0));
    levered.push(cfY + (isLast ? exitValue - balanceAt(N) : 0));
  }
  const unleveredIrr = irr(unlevered);
  const leveredIrr = i.mortgageAmount > 0 ? irr(levered) : unleveredIrr;

  return { grossRent, serviceCharge, vacancyCost, management, maintenance, opex, noi, allIn, equity, monthlyPay, annualDebt, annualCF, grossYield, netYield, cashOnCash, ltv, dscrVal, breakEven, payback, unleveredIrr, leveredIrr };
}

export function YieldAnalyzer() {
  const sp = useSearchParams();
  const listingId = sp.get("listing");
  const [inputs, setInputs] = React.useState<Inputs>(DEFAULTS);

  React.useEffect(() => {
    if (!listingId) return;
    apiGet<ScoredListing>(`/api/listings/${listingId}`)
      .then((l) =>
        setInputs((prev) => ({
          ...prev,
          purchasePrice: l.askingPriceAed ?? prev.purchasePrice,
          sizeSqft: l.sizeSqft ?? prev.sizeSqft,
          expectedRent: l.score.estimatedAnnualRentAed ?? prev.expectedRent,
          serviceChargePsf: l.serviceChargePsf ?? prev.serviceChargePsf,
          transferPct: l.emirate === "Dubai" ? 4 : 2,
        })),
      )
      .catch(() => {});
  }, [listingId]);

  const set = (k: keyof Inputs, v: number) => setInputs((s) => ({ ...s, [k]: Number.isFinite(v) ? v : 0 }));
  const a = analyze(inputs);

  const scenario = (rentG: number, priceG: number, vac: number) => analyze({ ...inputs, rentGrowth: rentG, priceGrowth: priceG, vacancyPct: vac });
  const bear = scenario(2, 1, 12);
  const base = a;
  const bull = scenario(8, 11, 3);

  // Sensitivity: levered IRR across rent growth × price growth
  const rentGrid = [2, 4, 6, 8, 10];
  const priceGrid = [0, 4, 8, 12, 16];

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[320px_1fr]">
      <Panel className="h-fit p-3">
        <div className="mb-2 text-2xs font-semibold uppercase tracking-wider text-terminal-muted">Inputs {listingId && <span className="text-accent">· prefilled from listing</span>}</div>
        <div className="grid grid-cols-2 gap-2">
          <NumberField label="Purchase price" v={inputs.purchasePrice} on={(v) => set("purchasePrice", v)} />
          <NumberField label="Size (sqft)" v={inputs.sizeSqft} on={(v) => set("sizeSqft", v)} />
          <NumberField label="Expected rent/yr" v={inputs.expectedRent} on={(v) => set("expectedRent", v)} />
          <NumberField label="Service charge/sqft" v={inputs.serviceChargePsf} on={(v) => set("serviceChargePsf", v)} />
          <NumberField label="Vacancy %" v={inputs.vacancyPct} on={(v) => set("vacancyPct", v)} />
          <NumberField label="Mgmt %" v={inputs.managementPct} on={(v) => set("managementPct", v)} />
          <NumberField label="Maintenance %" v={inputs.maintenancePct} on={(v) => set("maintenancePct", v)} />
          <NumberField label="Insurance/yr" v={inputs.insurance} on={(v) => set("insurance", v)} />
          <NumberField label="Mortgage amount" v={inputs.mortgageAmount} on={(v) => set("mortgageAmount", v)} />
          <NumberField label="Interest %" v={inputs.interestRate} on={(v) => set("interestRate", v)} />
          <NumberField label="Loan tenure (yr)" v={inputs.loanTenure} on={(v) => set("loanTenure", v)} />
          <NumberField label="Transfer %" v={inputs.transferPct} on={(v) => set("transferPct", v)} />
          <NumberField label="Broker %" v={inputs.brokerPct} on={(v) => set("brokerPct", v)} />
          <NumberField label="Furnishing" v={inputs.furnishing} on={(v) => set("furnishing", v)} />
          <NumberField label="Renovation" v={inputs.renovation} on={(v) => set("renovation", v)} />
          <NumberField label="Rent growth %" v={inputs.rentGrowth} on={(v) => set("rentGrowth", v)} />
          <NumberField label="Price growth %" v={inputs.priceGrowth} on={(v) => set("priceGrowth", v)} />
          <NumberField label="Holding (yr)" v={inputs.holdingPeriod} on={(v) => set("holdingPeriod", v)} />
        </div>
        <Button size="sm" variant="ghost" className="mt-2 w-full" onClick={() => setInputs(DEFAULTS)}>Reset</Button>
      </Panel>

      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Stat label="Gross yield" value={fmtPct(a.grossYield)} tone="good" />
          <Stat label="Net yield" value={fmtPct(a.netYield)} tone="good" />
          <Stat label="NOI" value={fmtAED(a.noi, { compact: true })} />
          <Stat label="Annual cashflow" value={fmtAED(a.annualCF, { compact: true })} tone={a.annualCF >= 0 ? "good" : "risk"} />
          <Stat label="Monthly cashflow" value={fmtAED(a.annualCF / 12, { compact: true })} />
          <Stat label="Cash-on-cash" value={fmtPct(a.cashOnCash)} tone={a.cashOnCash >= 0 ? "good" : "risk"} />
          <Stat label="Levered IRR" value={a.leveredIrr != null ? fmtPct(a.leveredIrr * 100) : "—"} tone="good" />
          <Stat label="Unlevered IRR" value={a.unleveredIrr != null ? fmtPct(a.unleveredIrr * 100) : "—"} />
          <Stat label="Payback" value={a.payback != null ? `${a.payback.toFixed(1)} yr` : "—"} />
          <Stat label="Break-even occ." value={a.breakEven != null ? fmtPct(a.breakEven * 100) : "—"} />
          <Stat label="DSCR" value={a.dscrVal != null ? a.dscrVal.toFixed(2) : "n/a"} tone={(a.dscrVal ?? 99) >= 1.2 ? "good" : "caution"} />
          <Stat label="LTV" value={fmtPct(a.ltv)} />
        </div>

        <Panel>
          <PanelHeader title="NOI breakdown" />
          <div className="grid grid-cols-2 gap-x-6 gap-y-1 p-4 text-2xs sm:grid-cols-3">
            <KV label="Gross rent" v={fmtAED(a.grossRent)} />
            <KV label="− Vacancy" v={fmtAED(a.vacancyCost)} />
            <KV label="− Service charge" v={fmtAED(a.serviceCharge)} />
            <KV label="− Management" v={fmtAED(a.management)} />
            <KV label="− Maintenance" v={fmtAED(a.maintenance)} />
            <KV label="− Insurance" v={fmtAED(inputs.insurance)} />
            <KV label="= NOI" v={fmtAED(a.noi)} strong />
            <KV label="All-in cost" v={fmtAED(a.allIn)} strong />
            <KV label="Equity invested" v={fmtAED(a.equity)} strong />
          </div>
        </Panel>

        <Panel>
          <PanelHeader title="Scenario analysis" subtitle="Bear / Base / Bull (rent growth · price growth · vacancy)" />
          <div className="grid grid-cols-3 gap-3 p-4">
            {[{ n: "Bear", s: bear, t: "risk" as const }, { n: "Base", s: base, t: "neutral" as const }, { n: "Bull", s: bull, t: "good" as const }].map(({ n, s }) => (
              <div key={n} className="rounded-md border border-terminal-border bg-terminal-panel2 p-3">
                <div className="text-xs font-semibold text-terminal-textHi">{n}</div>
                <div className="mt-1 space-y-0.5 text-2xs">
                  <KV label="Net yield" v={fmtPct(s.netYield)} />
                  <KV label="Levered IRR" v={s.leveredIrr != null ? fmtPct(s.leveredIrr * 100) : "—"} />
                  <KV label="Annual CF" v={fmtAED(s.annualCF, { compact: true })} />
                </div>
              </div>
            ))}
          </div>
        </Panel>

        <Panel>
          <PanelHeader title="Sensitivity — Levered IRR" subtitle="Rows: rent growth · Columns: price growth" />
          <div className="overflow-auto p-3">
            <table className="w-full text-2xs tnum">
              <thead>
                <tr><th className="p-1 text-left text-terminal-muted">rent ↓ / price →</th>{priceGrid.map((p) => <th key={p} className="p-1 text-right text-terminal-muted">{p}%</th>)}</tr>
              </thead>
              <tbody>
                {rentGrid.map((rg) => (
                  <tr key={rg}>
                    <td className="p-1 text-terminal-muted">{rg}%</td>
                    {priceGrid.map((pg) => {
                      const r = scenario(rg, pg, inputs.vacancyPct).leveredIrr;
                      const v = r != null ? r * 100 : null;
                      const tone = v == null ? "" : v >= 12 ? "text-signal-good" : v >= 6 ? "text-terminal-text" : "text-signal-risk";
                      return <td key={pg} className={`p-1 text-right ${tone}`}>{v != null ? `${v.toFixed(1)}%` : "—"}</td>;
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
        <p className="text-2xs text-terminal-muted">Decision-support estimates only — not financial advice. Transaction costs, growth and exit assumptions are user-entered.</p>
      </div>
    </div>
  );
}

function NumberField({ label, v, on }: { label: string; v: number; on: (v: number) => void }) {
  return (
    <Field label={label}>
      <Input type="number" value={Number.isFinite(v) ? v : ""} onChange={(e) => on(parseFloat(e.target.value))} />
    </Field>
  );
}
function KV({ label, v, strong }: { label: string; v: React.ReactNode; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-terminal-muted">{label}</span>
      <span className={strong ? "font-semibold text-terminal-textHi" : "text-terminal-text"}>{v}</span>
    </div>
  );
}
