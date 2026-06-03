import type {
  Alert,
  Area,
  DataSource,
  Developer,
  GovRent,
  GovTransaction,
  Listing,
  PaymentPlan,
  PortfolioAsset,
  PortfolioCashflow,
  Project,
  Watchlist,
  WatchlistItem,
} from "@/types/domain";

import { SAMPLE_AREAS } from "./areas";
import { SAMPLE_DEVELOPERS } from "./developers";
import { SAMPLE_PROJECTS } from "./projects";
import { SAMPLE_LISTINGS } from "./listings";
import { SAMPLE_PAYMENT_PLANS } from "./paymentPlans";
import { generateRents, generateTransactions } from "./transactions";
import { SAMPLE_PORTFOLIO, SAMPLE_CASHFLOWS, DEFAULT_USER_ID } from "./portfolio";
import { SAMPLE_SOURCES } from "./sources";
import { SAMPLE_ALERTS, SAMPLE_WATCHLISTS, SAMPLE_WATCHLIST_ITEMS } from "./engagement";

export interface SampleDataset {
  areas: Area[];
  developers: Developer[];
  projects: Project[];
  listings: Listing[];
  paymentPlans: PaymentPlan[];
  transactions: GovTransaction[];
  rents: GovRent[];
  sources: DataSource[];
  portfolio: PortfolioAsset[];
  cashflows: PortfolioCashflow[];
  watchlists: Watchlist[];
  watchlistItems: WatchlistItem[];
  alerts: Alert[];
}

let cached: SampleDataset | null = null;

/** Builds (once) the full in-memory SAMPLE dataset. */
export function buildSampleDataset(): SampleDataset {
  if (cached) return cached;
  cached = {
    areas: SAMPLE_AREAS,
    developers: SAMPLE_DEVELOPERS,
    projects: SAMPLE_PROJECTS,
    listings: SAMPLE_LISTINGS,
    paymentPlans: SAMPLE_PAYMENT_PLANS,
    transactions: generateTransactions(),
    rents: generateRents(),
    sources: SAMPLE_SOURCES,
    portfolio: SAMPLE_PORTFOLIO,
    cashflows: SAMPLE_CASHFLOWS,
    watchlists: SAMPLE_WATCHLISTS,
    watchlistItems: SAMPLE_WATCHLIST_ITEMS,
    alerts: SAMPLE_ALERTS,
  };
  return cached;
}

export { DEFAULT_USER_ID };
export * from "./areas";
export * from "./developers";
export * from "./projects";
export * from "./listings";
export * from "./paymentPlans";
