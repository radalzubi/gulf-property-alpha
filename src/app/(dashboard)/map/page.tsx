"use client";

import dynamic from "next/dynamic";
import { Topbar } from "@/components/shell/Topbar";
import { Skeleton } from "@/components/ui";

const MapView = dynamic(() => import("@/components/map/MapView").then((m) => m.MapView), {
  ssr: false,
  loading: () => <Skeleton className="h-[76vh]" />,
});

export default function MapPage() {
  return (
    <>
      <Topbar title="Map" subtitle="Browse properties on the map — pins show price, colored by deal score" />
      <div className="animate-fade-in p-5">
        <MapView />
      </div>
    </>
  );
}
