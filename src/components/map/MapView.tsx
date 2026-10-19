"use client";

import * as React from "react";
import Link from "next/link";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { useQuery } from "@tanstack/react-query";
import type { ScoredListing } from "@/types/domain";
import { apiGet } from "@/lib/client";
import { fmtAED, fmtNum, fmtPct, cn } from "@/lib/utils";
import { dealScoreTone } from "@/lib/scoring";
import { X } from "lucide-react";

type ListingsResp = { items: ScoredListing[] };
type Metric = "price" | "psf" | "score" | "yield";
type EmFilter = "All" | "Dubai" | "Abu Dhabi";

const METRICS: { id: Metric; label: string }[] = [
  { id: "price", label: "Price" },
  { id: "psf", label: "Per sqft" },
  { id: "score", label: "Score" },
  { id: "yield", label: "Net yield" },
];

const TONE_HEX: Record<string, string> = { good: "#15803d", caution: "#b45309", risk: "#b91c1c" };

// Clean light street basemap (CARTO Positron) — free with attribution, no token.
const CARTO_STYLE: maplibregl.StyleSpecification = {
  version: 8,
  sources: {
    carto: {
      type: "raster",
      tiles: [
        "https://a.basemaps.cartocdn.com/light_all/{z}/{x}/{y}@2x.png",
        "https://b.basemaps.cartocdn.com/light_all/{z}/{x}/{y}@2x.png",
        "https://c.basemaps.cartocdn.com/light_all/{z}/{x}/{y}@2x.png",
        "https://d.basemaps.cartocdn.com/light_all/{z}/{x}/{y}@2x.png",
      ],
      tileSize: 256,
      attribution: '© OpenStreetMap contributors © CARTO',
    },
  },
  layers: [{ id: "carto", type: "raster", source: "carto" }],
};
const STYLE: string | maplibregl.StyleSpecification = process.env.NEXT_PUBLIC_MAP_STYLE_URL || CARTO_STYLE;

function pillLabel(metric: Metric, l: ScoredListing): string {
  switch (metric) {
    case "psf":
      return l.pricePerSqft ? fmtNum(l.pricePerSqft) : "—";
    case "score":
      return String(l.score.totalDealScore);
    case "yield":
      return l.score.estimatedNetYield != null ? `${l.score.estimatedNetYield.toFixed(1)}%` : "—";
    default: {
      const v = l.askingPriceAed;
      if (!v) return "—";
      return v >= 1_000_000 ? `${(v / 1_000_000).toFixed(1)}M` : `${Math.round(v / 1000)}K`;
    }
  }
}

interface MarkerRec {
  marker: maplibregl.Marker;
  el: HTMLButtonElement;
  dot: HTMLSpanElement;
  label: HTMLSpanElement;
  listing: ScoredListing;
}

const PILL_BASE = "flex items-center gap-1 rounded-full border px-2 py-1 text-[11px] font-semibold shadow-card cursor-pointer transition-colors";
const PILL_DEFAULT = "bg-white border-[#d3d7dd] text-[#0a0a0a] hover:border-black";
const PILL_ACTIVE = "bg-black border-black text-white";

export function MapView() {
  const ref = React.useRef<HTMLDivElement>(null);
  const mapRef = React.useRef<maplibregl.Map | null>(null);
  const markersRef = React.useRef<Map<string, MarkerRec>>(new Map());
  const [ready, setReady] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const [metric, setMetric] = React.useState<Metric>("price");
  const [emirate, setEmirate] = React.useState<EmFilter>("All");
  const [activeId, setActiveId] = React.useState<string | null>(null);
  const [hoverId, setHoverId] = React.useState<string | null>(null);
  const [showHeat, setShowHeat] = React.useState(false);

  const { data } = useQuery({ queryKey: ["map-listings"], queryFn: () => apiGet<ListingsResp>("/api/listings?limit=500&hideDuplicates=true") });

  const all = React.useMemo(() => (data?.items ?? []).filter((l) => l.lat && l.lng), [data]);
  const listings = React.useMemo(() => all.filter((l) => emirate === "All" || l.emirate === emirate).sort((a, b) => b.score.totalDealScore - a.score.totalDealScore), [all, emirate]);
  const listingsKey = listings.map((l) => l.id).join(",");
  const active = listings.find((l) => l.id === activeId) ?? null;

  // init map once
  React.useEffect(() => {
    if (!ref.current || mapRef.current) return;
    try {
      const map = new maplibregl.Map({ container: ref.current, style: STYLE, center: [54.6, 24.9], zoom: 8 });
      map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "bottom-right");
      map.on("load", () => setReady(true));
      mapRef.current = map;
    } catch (e) {
      setError((e as Error).message);
    }
    return () => {
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, []);

  const flyTo = React.useCallback((l: ScoredListing) => {
    const map = mapRef.current;
    if (!map) return;
    map.flyTo({ center: [l.lng!, l.lat!], zoom: Math.max(map.getZoom(), 12.5), duration: 600 });
  }, []);

  // (re)build markers when the filtered set changes
  React.useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;

    markersRef.current.forEach((m) => m.marker.remove());
    markersRef.current.clear();

    const bounds = new maplibregl.LngLatBounds();
    for (const l of listings) {
      const el = document.createElement("button");
      el.type = "button";
      el.className = `${PILL_BASE} ${PILL_DEFAULT}`;
      const dot = document.createElement("span");
      dot.className = "inline-block h-1.5 w-1.5 rounded-full shrink-0";
      const label = document.createElement("span");
      label.className = "whitespace-nowrap";
      el.append(dot, label);
      el.addEventListener("click", (ev) => {
        ev.stopPropagation();
        setActiveId(l.id);
        flyTo(l);
      });
      el.addEventListener("mouseenter", () => setHoverId(l.id));
      el.addEventListener("mouseleave", () => setHoverId(null));
      const marker = new maplibregl.Marker({ element: el }).setLngLat([l.lng!, l.lat!]).addTo(map);
      markersRef.current.set(l.id, { marker, el, dot, label, listing: l });
      bounds.extend([l.lng!, l.lat!]);
    }
    if (listings.length) map.fitBounds(bounds, { padding: 70, maxZoom: 12.5, duration: 500 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, listingsKey, flyTo]);

  // update marker label/colors on metric/active/hover change
  React.useEffect(() => {
    markersRef.current.forEach((m, id) => {
      const isActive = id === activeId;
      const isHover = id === hoverId;
      m.el.className = `${PILL_BASE} ${isActive ? PILL_ACTIVE : PILL_DEFAULT} ${isHover && !isActive ? "border-black" : ""}`;
      m.el.style.zIndex = isActive ? "30" : isHover ? "20" : "1";
      m.dot.style.background = isActive ? "#ffffff" : TONE_HEX[dealScoreTone(m.listing.score.totalDealScore)];
      m.label.textContent = pillLabel(metric, m.listing);
    });
  }, [metric, activeId, hoverId, listingsKey]);

  // heatmap overlay toggle
  React.useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    const fc = {
      type: "FeatureCollection" as const,
      features: listings.map((l) => ({ type: "Feature" as const, geometry: { type: "Point" as const, coordinates: [l.lng!, l.lat!] }, properties: { score: l.score.totalDealScore } })),
    };
    const src = map.getSource("heat-src") as maplibregl.GeoJSONSource | undefined;
    if (src) src.setData(fc as never);
    else map.addSource("heat-src", { type: "geojson", data: fc as never });

    if (showHeat && !map.getLayer("heat")) {
      map.addLayer({
        id: "heat",
        type: "heatmap",
        source: "heat-src",
        paint: {
          "heatmap-weight": ["interpolate", ["linear"], ["get", "score"], 0, 0.1, 100, 1],
          "heatmap-radius": ["interpolate", ["linear"], ["zoom"], 8, 24, 13, 60],
          "heatmap-opacity": 0.55,
          "heatmap-color": ["interpolate", ["linear"], ["heatmap-density"], 0, "rgba(0,0,0,0)", 0.3, "#dbeafe", 0.6, "#fde68a", 1, "#86efac"],
        },
      });
    }
    if (!showHeat && map.getLayer("heat")) map.removeLayer("heat");
    // Keyed on listingsKey (the listing ids) like the marker effects above, so a new
    // array holding the same listings doesn't rebuild the heatmap source.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, showHeat, listingsKey]);

  // scroll active list row into view
  React.useEffect(() => {
    if (!activeId) return;
    document.getElementById(`row-${activeId}`)?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [activeId]);

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[360px_1fr]">
      {/* List */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-1">
          {(["All", "Dubai", "Abu Dhabi"] as EmFilter[]).map((e) => (
            <button
              key={e}
              onClick={() => { setEmirate(e); setActiveId(null); }}
              className={cn("rounded-full border px-2.5 py-1 text-2xs font-medium transition-colors", emirate === e ? "border-black bg-black text-white" : "border-terminal-border bg-terminal-panel text-terminal-muted hover:text-terminal-textHi")}
            >
              {e}
            </button>
          ))}
          <span className="ml-auto text-2xs text-terminal-muted">{listings.length} properties</span>
        </div>
        <div className="panel max-h-[68vh] divide-y divide-terminal-border overflow-y-auto">
          {listings.map((l) => {
            const tone = dealScoreTone(l.score.totalDealScore);
            const isActive = l.id === activeId;
            return (
              <button
                id={`row-${l.id}`}
                key={l.id}
                onClick={() => { setActiveId(l.id); flyTo(l); }}
                onMouseEnter={() => setHoverId(l.id)}
                onMouseLeave={() => setHoverId(null)}
                className={cn("flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors", isActive ? "bg-terminal-panel2" : "hover:bg-terminal-panel2/60")}
              >
                <span className="h-9 w-9 shrink-0 overflow-hidden rounded-md bg-terminal-panel2">
                  {l.imageUrls[0] && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={l.imageUrls[0]} alt="" className="h-full w-full object-cover" loading="lazy" />
                  )}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-xs font-medium text-terminal-textHi">{l.title}</span>
                  <span className="block truncate text-2xs text-terminal-muted">{l.areaName} · net yield {fmtPct(l.score.estimatedNetYield)}</span>
                </span>
                <span className="shrink-0 text-right">
                  <span className="block text-xs font-semibold tnum text-terminal-textHi">{fmtAED(l.askingPriceAed, { compact: true })}</span>
                  <span className="inline-flex items-center gap-1 text-2xs text-terminal-muted"><span className="h-1.5 w-1.5 rounded-full" style={{ background: TONE_HEX[tone] }} />{l.score.totalDealScore}</span>
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Map */}
      <div className="panel relative overflow-hidden" style={{ height: "72vh" }}>
        <div ref={ref} className="h-full w-full" />

        {/* metric toggle + heat */}
        <div className="absolute left-3 top-3 z-10 flex items-center gap-2">
          <div className="flex rounded-full border border-terminal-border bg-white p-0.5 shadow-card">
            {METRICS.map((m) => (
              <button
                key={m.id}
                onClick={() => setMetric(m.id)}
                className={cn("rounded-full px-2.5 py-1 text-2xs font-medium transition-colors", metric === m.id ? "bg-black text-white" : "text-terminal-muted hover:text-terminal-textHi")}
              >
                {m.label}
              </button>
            ))}
          </div>
          <button
            onClick={() => setShowHeat((v) => !v)}
            className={cn("rounded-full border px-2.5 py-1 text-2xs font-medium shadow-card transition-colors", showHeat ? "border-black bg-black text-white" : "border-terminal-border bg-white text-terminal-muted hover:text-terminal-textHi")}
          >
            Heatmap
          </button>
        </div>

        {/* legend */}
        <div className="absolute bottom-3 left-3 z-10 flex items-center gap-3 rounded-full border border-terminal-border bg-white/90 px-3 py-1.5 text-2xs text-terminal-muted shadow-card backdrop-blur">
          <span className="font-medium text-terminal-textHi">Deal score</span>
          <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-signal-good" /> strong</span>
          <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-signal-caution" /> fair</span>
          <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-signal-risk" /> pricey</span>
        </div>

        {/* selected card */}
        {active && (
          <div className="absolute bottom-3 right-3 z-20 w-72 overflow-hidden rounded-xl border border-terminal-border bg-white shadow-card">
            <div className="relative h-28 bg-terminal-panel2">
              {active.imageUrls[0] && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={active.imageUrls[0]} alt="" className="h-full w-full object-cover" />
              )}
              <button onClick={() => setActiveId(null)} className="absolute right-2 top-2 rounded-full bg-white/90 p-1 text-terminal-muted hover:text-terminal-textHi"><X className="h-3.5 w-3.5" /></button>
            </div>
            <div className="space-y-1.5 p-3">
              <div className="text-sm font-semibold text-terminal-textHi line-clamp-1">{active.title}</div>
              <div className="text-2xs text-terminal-muted">{active.emirate} · {active.areaName}{active.buildingName ? ` · ${active.buildingName}` : ""}</div>
              <div className="flex items-center justify-between pt-1 text-xs">
                <span className="font-semibold tnum text-terminal-textHi">{fmtAED(active.askingPriceAed, { compact: true })}</span>
                <span className="text-terminal-muted">net yield {fmtPct(active.score.estimatedNetYield)}</span>
                <span className="inline-flex items-center gap-1 text-terminal-muted"><span className="h-1.5 w-1.5 rounded-full" style={{ background: TONE_HEX[dealScoreTone(active.score.totalDealScore)] }} />{active.score.totalDealScore}</span>
              </div>
              <Link href={`/listings/${active.id}`} className="mt-1 block rounded-md bg-black px-3 py-1.5 text-center text-xs font-medium text-white hover:bg-black/90">Open details</Link>
            </div>
          </div>
        )}

        {error && <div className="absolute inset-0 flex items-center justify-center bg-white text-2xs text-signal-risk">Map failed to load: {error}</div>}
        {!ready && !error && <div className="absolute inset-0 flex items-center justify-center bg-white text-2xs text-terminal-muted">Loading map…</div>}
      </div>
    </div>
  );
}
