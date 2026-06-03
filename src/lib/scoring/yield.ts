import type { Emirate } from "@/types/domain";

export interface YieldAssumptions {
  /** Recurring, as % of gross annual rent unless noted. */
  vacancyAllowancePct: number;
  managementFeePct: number;
  maintenanceReservePct: number;
  insuranceAed: number; // absolute annual
  otherExpensesAed: number; // absolute annual
  /** Service charge: absolute annual; if null, derived from serviceChargePsf*size or fallback. */
  serviceChargeAed: number | null;
  serviceChargePsfFallback: number; // used when neither absolute nor psf known
  // One-off acquisition costs (folded into all-in cost):
  transferCostPct: number; // DLD/registration transfer fee
  brokerFeePct: number;
  conveyancingAed: number;
  furnishingAed: number;
  renovationAed: number;
}

export function defaultAssumptions(emirate: Emirate): YieldAssumptions {
  // Dubai DLD transfer ~4%; Abu Dhabi registration ~2%.
  const transferCostPct = emirate === "Dubai" ? 4 : 2;
  return {
    vacancyAllowancePct: 6,
    managementFeePct: 5,
    maintenanceReservePct: 5,
    insuranceAed: 800,
    otherExpensesAed: 0,
    serviceChargeAed: null,
    serviceChargePsfFallback: 16,
    transferCostPct,
    brokerFeePct: 2,
    conveyancingAed: 5000,
    furnishingAed: 0,
    renovationAed: 0,
  };
}

export interface YieldResult {
  grossRentAed: number;
  effectiveGrossRentAed: number; // after vacancy
  serviceChargeAed: number;
  managementFeeAed: number;
  maintenanceAed: number;
  vacancyCostAed: number;
  insuranceAed: number;
  otherExpensesAed: number;
  operatingExpensesAed: number; // excludes debt
  noiAed: number;
  allInAcquisitionCostAed: number;
  grossYieldPct: number | null;
  netYieldPct: number | null;
  serviceChargeAssumed: boolean;
}

export function computeYield(input: {
  askingPriceAed: number;
  estimatedAnnualRentAed: number | null;
  sizeSqft: number | null;
  serviceChargePsf?: number | null;
  assumptions: YieldAssumptions;
}): YieldResult {
  const { askingPriceAed, estimatedAnnualRentAed, sizeSqft, serviceChargePsf, assumptions: a } = input;
  const grossRent = estimatedAnnualRentAed ?? 0;

  let serviceChargeAssumed = false;
  let serviceChargeAed = a.serviceChargeAed ?? 0;
  if (a.serviceChargeAed == null) {
    if (serviceChargePsf != null && sizeSqft != null) {
      serviceChargeAed = serviceChargePsf * sizeSqft;
    } else if (sizeSqft != null) {
      serviceChargeAed = a.serviceChargePsfFallback * sizeSqft;
      serviceChargeAssumed = true;
    } else {
      serviceChargeAed = 0;
      serviceChargeAssumed = true;
    }
  }

  const vacancyCost = grossRent * (a.vacancyAllowancePct / 100);
  const effectiveGrossRent = grossRent - vacancyCost;
  const managementFee = grossRent * (a.managementFeePct / 100);
  const maintenance = grossRent * (a.maintenanceReservePct / 100);

  const operatingExpenses = serviceChargeAed + managementFee + maintenance + a.insuranceAed + a.otherExpensesAed;
  const noi = effectiveGrossRent - operatingExpenses;

  const allInAcquisitionCost =
    askingPriceAed +
    askingPriceAed * (a.transferCostPct / 100) +
    askingPriceAed * (a.brokerFeePct / 100) +
    a.conveyancingAed +
    a.furnishingAed +
    a.renovationAed;

  const grossYieldPct = askingPriceAed > 0 && estimatedAnnualRentAed != null ? (grossRent / askingPriceAed) * 100 : null;
  const netYieldPct = allInAcquisitionCost > 0 && estimatedAnnualRentAed != null ? (noi / allInAcquisitionCost) * 100 : null;

  return {
    grossRentAed: grossRent,
    effectiveGrossRentAed: effectiveGrossRent,
    serviceChargeAed,
    managementFeeAed: managementFee,
    maintenanceAed: maintenance,
    vacancyCostAed: vacancyCost,
    insuranceAed: a.insuranceAed,
    otherExpensesAed: a.otherExpensesAed,
    operatingExpensesAed: operatingExpenses,
    noiAed: noi,
    allInAcquisitionCostAed: allInAcquisitionCost,
    grossYieldPct,
    netYieldPct,
    serviceChargeAssumed,
  };
}
