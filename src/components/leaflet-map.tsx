"use client";

import dynamic from "next/dynamic";
import type { LeafletMapProps } from "@/components/leaflet-map-impl";

const LeafletMapImpl = dynamic(() => import("@/components/leaflet-map-impl").then((m) => m.LeafletMap), {
  ssr: false,
  loading: () => <div className="leaflet-host" aria-hidden="true" />,
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
