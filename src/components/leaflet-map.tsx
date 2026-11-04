"use client";

import dynamic from "next/dynamic";
import type { LeafletMapProps } from "@/components/leaflet-map-impl";
import { LoadingIndicator } from "@/components/loading-indicator";

const LeafletMapImpl = dynamic(() => import("@/components/leaflet-map-impl").then((m) => m.LeafletMap), {
  ssr: false,
  loading: () => (
    <div className="leaflet-host grid place-items-center">
      <LoadingIndicator className="size-10" label="جارٍ تحميل الخريطة" />
    </div>
  ),
});

export type {
  LeafletMapProps,
  MapMarker,
  MapMarkerGlyph,
  MapMarkerVariant,
  MapRoute,
} from "@/components/leaflet-map-impl";

export function LeafletMap(props: LeafletMapProps) {
  return <LeafletMapImpl {...props} />;
}
