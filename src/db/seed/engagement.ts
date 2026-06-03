import type { Alert, Watchlist, WatchlistItem } from "@/types/domain";
import { DEFAULT_USER_ID } from "./portfolio";
import { daysAgo } from "./prng";

export const SAMPLE_WATCHLISTS: Watchlist[] = [
  {
    id: "wl-1",
    userId: DEFAULT_USER_ID,
    name: "High-yield Dubai studios",
    criteria: { emirate: "Dubai", propertyType: "Apartment", bedrooms: 0, minNetYield: 6 },
    itemCount: 2,
  },
  {
    id: "wl-2",
    userId: DEFAULT_USER_ID,
    name: "Abu Dhabi vacant value plays",
    criteria: { emirate: "Abu Dhabi", occupancyStatus: "Vacant" },
    itemCount: 1,
  },
];

export const SAMPLE_WATCHLIST_ITEMS: WatchlistItem[] = [
  { id: "wi-1", watchlistId: "wl-1", listingId: "lst-jvc-bloom-studio", addedAt: daysAgo(10), status: "watching", notes: "Compare vs Arjan studio" },
  { id: "wi-2", watchlistId: "wl-1", listingId: "lst-arjan-samana-studio", addedAt: daysAgo(4), status: "watching" },
  { id: "wi-3", watchlistId: "wl-2", listingId: "lst-reem-reflection-2br", addedAt: daysAgo(6), status: "contacted", notes: "Agent says flexible" },
];

export const SAMPLE_ALERTS: Alert[] = [
  {
    id: "al-1",
    userId: DEFAULT_USER_ID,
    alertType: "underpriced_detected",
    listingId: "lst-jvc-belgravia-2br",
    severity: "opportunity",
    title: "Underpriced listing detected — Belgravia Heights 2BR",
    message: "Asking ~21% below area median PSF with two recorded price reductions. Comp support is medium-confidence.",
    createdAt: daysAgo(1),
  },
  {
    id: "al-2",
    userId: DEFAULT_USER_ID,
    alertType: "price_drop",
    listingId: "lst-marina-vista-2br",
    severity: "opportunity",
    title: "Price drop — Marina Vista 2BR",
    message: "Price reduced from AED 2.15M → 2.05M. Now ~17% below area median PSF.",
    createdAt: daysAgo(2),
  },
  {
    id: "al-3",
    userId: DEFAULT_USER_ID,
    alertType: "portfolio_rent_renewal",
    assetId: "asset-1",
    severity: "warning",
    title: "Lease renewal due in ~8 months — Marina Gate 1",
    message: "Current rent AED 98,000 may be below market. Review renewal vs RERA index uplift.",
    createdAt: daysAgo(3),
  },
  {
    id: "al-4",
    userId: DEFAULT_USER_ID,
    alertType: "watched_stale",
    listingId: "lst-downtown-forte-1br-stale",
    severity: "info",
    title: "Watched listing is stale — Forte 1",
    message: "Listing has been live 165 days without a price change or refresh in 10 days.",
    createdAt: daysAgo(1),
  },
  {
    id: "al-5",
    userId: DEFAULT_USER_ID,
    alertType: "portfolio_concentration",
    severity: "warning",
    title: "Concentration: Dubai Marina + Emaar",
    message: "A large share of portfolio value sits in Dubai and with a single developer. Consider diversifying.",
    createdAt: daysAgo(5),
  },
];
