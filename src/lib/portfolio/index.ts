import type { PortfolioAsset } from "@/types/domain";
import type { PortfolioSummary } from "@/lib/repo/types";
import { irr } from "@/lib/finance";
import { clamp } from "@/lib/utils";

const opex = (a: PortfolioAsset) => a.serviceChargesAed + a.maintenanceAed + a.managementFeeAed + a.insuranceAed + a.otherExpensesAed;

export function computePortfolioSummary(assets: PortfolioAsset[], now: Date = new Date()): PortfolioSummary {
  const live = assets.filter((a) => a.status !== "Sold");
  const sold = assets.filter((a) => a.status === "Sold");
  const income = live.filter((a) => a.status !== "Off-Plan" && a.status !== "Planned");

  const totalValue = live.reduce((s, a) => s + a.currentEstimatedValueAed, 0);
  const debt = live.reduce((s, a) => s + a.mortgageBalanceAed, 0);
  const equity = totalValue - debt;
  const ltv = totalValue > 0 ? (debt / totalValue) * 100 : 0;

  const annualRent = income.reduce((s, a) => s + a.annualRentAed, 0);
  const totalOpex = income.reduce((s, a) => s + opex(a), 0);
  const noi = annualRent - totalOpex;
  const annualDebtService = live.reduce((s, a) => s + a.monthlyPaymentAed * 12, 0);

  const grossYield = totalValue > 0 ? (annualRent / totalValue) * 100 : 0;
  const netYield = totalValue > 0 ? (noi / totalValue) * 100 : 0;
  const cashOnCash = equity > 0 ? ((noi - annualDebtService) / equity) * 100 : 0;

  const unrealizedGain = live.reduce((s, a) => s + (a.currentEstimatedValueAed - a.purchasePriceAed), 0);
  const realizedGain = sold.reduce((s, a) => s + ((a.soldPriceAed ?? 0) - a.purchasePriceAed), 0);

  // Approximate portfolio IRR from a synthesized annual series (labeled approximate in UI).
  const acqMonths = income
    .filter((a) => a.acquisitionDate)
    .map((a) => (now.getTime() - new Date(a.acquisitionDate!).getTime()) / (86_400_000 * 30));
  const avgMonths = acqMonths.length ? acqMonths.reduce((s, m) => s + m, 0) / acqMonths.length : 12;
  const years = Math.max(1, Math.round(avgMonths / 12));
  const totalPurchase = income.reduce((s, a) => s + a.purchasePriceAed, 0);
  const annualNet = noi - annualDebtService;
  let portfolioIrr: number | null = null;
  if (totalPurchase > 0) {
    const series = [-totalPurchase];
    for (let y = 1; y < years; y++) series.push(annualNet);
    series.push(annualNet + (totalValue - debt));
    portfolioIrr = irr(series);
  }

  const dscrVal = annualDebtService > 0 ? noi / annualDebtService : null;

  const vacantValue = live.filter((a) => a.occupancyStatus === "Vacant").reduce((s, a) => s + a.currentEstimatedValueAed, 0);
  const vacancyExposurePct = totalValue > 0 ? (vacantValue / totalValue) * 100 : 0;

  const concentration = (key: (a: PortfolioAsset) => string) => {
    const m = new Map<string, number>();
    for (const a of live) m.set(key(a), (m.get(key(a)) ?? 0) + a.currentEstimatedValueAed);
    return [...m.entries()].map(([k, v]) => ({ key: k, pct: totalValue > 0 ? (v / totalValue) * 100 : 0 })).sort((x, y) => y.pct - x.pct);
  };
  const geographicConcentration = concentration((a) => a.emirate);
  const developerConcentration = concentration((a) => a.developerId ?? "Unknown");

  const offPlanValue = live.filter((a) => a.status === "Off-Plan").reduce((s, a) => s + a.currentEstimatedValueAed, 0);
  const readyValue = income.reduce((s, a) => s + a.currentEstimatedValueAed, 0);
  const offPlanExposurePct = totalValue > 0 ? (offPlanValue / totalValue) * 100 : 0;
  const readyExposurePct = totalValue > 0 ? (readyValue / totalValue) * 100 : 0;

  const topGeo = geographicConcentration[0]?.pct ?? 0;
  const topDev = developerConcentration[0]?.pct ?? 0;
  const riskScore = clamp(
    0.3 * Math.max(0, topGeo - 50) + 0.3 * Math.max(0, topDev - 40) + 0.2 * ltv + 0.1 * vacancyExposurePct + 0.2 * offPlanExposurePct,
    0,
    100,
  );

  // Rent renewals within 12 months.
  const rentRenewals = income
    .filter((a) => a.leaseEnd)
    .map((a) => {
      const monthsToEnd = (new Date(a.leaseEnd!).getTime() - now.getTime()) / (86_400_000 * 30);
      return { assetId: a.id, assetName: a.assetName, leaseEnd: a.leaseEnd!, monthsToEnd: Math.round(monthsToEnd) };
    })
    .filter((r) => r.monthsToEnd <= 12)
    .sort((a, b) => a.monthsToEnd - b.monthsToEnd);

  // Recommended actions (rule-based, decision support).
  const recommendedActions: PortfolioSummary["recommendedActions"] = [];
  if (ltv > 60) recommendedActions.push({ severity: "warning", title: "Elevated leverage", detail: `Portfolio LTV is ${ltv.toFixed(0)}%. Consider deleveraging or refinancing to manage rate risk.` });
  if (topGeo > 60) recommendedActions.push({ severity: "warning", title: "Geographic concentration", detail: `${geographicConcentration[0].key} is ${topGeo.toFixed(0)}% of value. Consider diversifying across emirates.` });
  if (topDev > 50) recommendedActions.push({ severity: "warning", title: "Developer concentration", detail: `A single developer is ${topDev.toFixed(0)}% of value.` });
  if (vacancyExposurePct > 15) recommendedActions.push({ severity: "warning", title: "Vacancy exposure", detail: `${vacancyExposurePct.toFixed(0)}% of value is vacant. Prioritize lease-up.` });
  for (const r of rentRenewals) recommendedActions.push({ assetId: r.assetId, severity: r.monthsToEnd <= 3 ? "warning" : "info", title: `Lease renewal: ${r.assetName}`, detail: `Lease ends in ~${r.monthsToEnd} months — review rent vs market/RERA index.` });
  // Underperformers: net yield materially below portfolio net yield.
  for (const a of income) {
    const ny = a.currentEstimatedValueAed > 0 ? ((a.annualRentAed - opex(a)) / a.currentEstimatedValueAed) * 100 : 0;
    if (a.annualRentAed > 0 && ny < netYield - 2) recommendedActions.push({ assetId: a.id, severity: "info", title: `Underperforming: ${a.assetName}`, detail: `Net yield ~${ny.toFixed(1)}% vs portfolio ${netYield.toFixed(1)}%. Review rent or consider sell/hold.` });
  }
  if (recommendedActions.length === 0) recommendedActions.push({ severity: "info", title: "Portfolio balanced", detail: "No concentration, leverage, or vacancy flags detected." });

  return {
    totalValue,
    equity,
    debt,
    ltv,
    annualRent,
    noi,
    grossYield,
    netYield,
    cashOnCash,
    unrealizedGain,
    realizedGain,
    irr: portfolioIrr,
    dscr: dscrVal,
    vacancyExposurePct,
    geographicConcentration,
    developerConcentration,
    offPlanExposurePct,
    readyExposurePct,
    riskScore,
    recommendedActions,
    rentRenewals,
  };
}
