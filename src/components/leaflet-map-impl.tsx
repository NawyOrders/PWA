"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

export type MapMarkerVariant = "pin" | "drop" | "dot" | "courier" | "store";
export type MapMarkerGlyph = "fork" | "home" | "store" | "bike" | "heart" | "none";

export type MapMarker = {
  id: string;
  lat: number;
  lng: number;
  variant?: MapMarkerVariant;
  glyph?: MapMarkerGlyph;
  label?: string;
  labelTone?: "brand" | "muted";
  active?: boolean;
  position?: "end" | "center";
};

export type MapRoute = {
  id: string;
  positions: [number, number][];
  color?: string;
  width?: number;
  dashed?: boolean;
};

export type LeafletMapProps = {
  markers?: MapMarker[];
  routes?: MapRoute[];
  center: [number, number];
  zoom?: number;
  theme?: "dark" | "light";
  interactive?: boolean;
  scrollWheelZoom?: boolean;
  fitToContent?: boolean;
  className?: string;
  ariaLabel: string;
  onPick?: (point: { lat: number; lng: number }) => void;
  onMarkerClick?: (id: string) => void;
};

const TILES = {
  url: "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
  attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  maxZoom: 19,
};

const GLYPHS: Record<MapMarkerGlyph, string> = {
  fork: '<path d="M4 2v6a2 2 0 0 0 4 0V2M6 2v20M14 2c-1.7 0-3 2-3 5s1.3 4 3 4v11"/>',
  home: '<path d="M3 10.5 12 3l9 7.5M5.5 9v11h13V9"/>',
  store: '<path d="M3 7l1.6-3.5h14.8L21 7M3 7h18M3 7a2.6 2.6 0 0 0 4.5 1.8A2.6 2.6 0 0 0 12 10a2.6 2.6 0 0 0 4.5-1.2A2.6 2.6 0 0 0 21 7M5 11v9.5h14V11"/>',
  bike: '<circle cx="5.5" cy="17" r="3.5"/><circle cx="18.5" cy="17" r="3.5"/><path d="M15 6h3l2 5M5.5 17 10 8h4l-3.5 9"/>',
  heart: '<path d="M12 20s-7.5-4.7-7.5-9.8A4.2 4.2 0 0 1 12 7a4.2 4.2 0 0 1 7.5 3.2C19.5 15.3 12 20 12 20Z"/>',
  none: "",
};

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function glyphSvg(glyph: MapMarkerGlyph, size: number, color: string) {
  if (glyph === "none") return "";
  return `<svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${GLYPHS[glyph]}</svg>`;
}

function markerHtml(marker: MapMarker) {
  const variant = marker.variant ?? "pin";
  const glyph = marker.glyph ?? "none";
  const label = marker.label
    ? `<span class="nawy-map-label${marker.labelTone === "muted" ? " is-muted" : ""}">${escapeHtml(marker.label)}</span>`
    : "";

  if (variant === "dot") {
    const size = marker.active ? 16 : 12;
    return `<span class="nawy-map-dot${marker.active ? " is-active" : ""}" style="width:${size}px;height:${size}px"></span>`;
  }

  if (variant === "courier") {
    return `<span class="nawy-map-courier">${label}${glyphSvg("bike", 18, "#fff")}</span>`;
  }

  if (variant === "store") {
    return `<span class="nawy-map-badge${marker.active ? " is-active" : ""}">${label}${glyphSvg(
      glyph === "none" ? "store" : glyph,
      18,
      marker.active ? "#fff" : "#e8452c",
    )}</span>`;
  }

  if (variant === "drop") {
    return `<span class="nawy-map-drop${marker.active ? " is-active" : ""}">${label}${glyphSvg(
      glyph,
      15,
      marker.active ? "#fff" : "#8b7a6d",
    )}</span>`;
  }

  return `<span class="nawy-map-pin${marker.active ? " is-active" : ""}">${label}${glyphSvg(glyph, 16, "#fff")}</span>`;
}

function iconFor(marker: MapMarker) {
  const variant = marker.variant ?? "pin";
  const size: [number, number] = variant === "dot" ? [18, 18] : [46, 52];
  return L.divIcon({
    className: `nawy-map-icon nawy-map-icon--${variant}`,
    html: markerHtml(marker),
    iconSize: size,
    iconAnchor: variant === "dot" ? [9, 9] : [23, 48],
  });
}

export function LeafletMap({
  markers = [],
  routes = [],
  center,
  zoom = 13,
  theme = "light",
  interactive = true,
  scrollWheelZoom = false,
  fitToContent = false,
  className = "",
  ariaLabel,
  onPick,
  onMarkerClick,
}: LeafletMapProps) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerLayer = useRef<L.LayerGroup | null>(null);
  const routeLayer = useRef<L.LayerGroup | null>(null);
  const pickRef = useRef(onPick);
  const clickRef = useRef(onMarkerClick);
  const didFit = useRef(false);

  pickRef.current = onPick;
  clickRef.current = onMarkerClick;

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    const map = L.map(host, {
      center,
      zoom,
      zoomControl: false,
      attributionControl: true,
      scrollWheelZoom,
      dragging: interactive,
      doubleClickZoom: interactive,
      boxZoom: interactive,
      keyboard: interactive,
      touchZoom: interactive,
      inertia: interactive,
    });
    map.attributionControl.setPrefix(false);

    const tiles = L.tileLayer(TILES.url, {
      attribution: TILES.attribution,
      maxZoom: TILES.maxZoom,
      crossOrigin: true,
    }).addTo(map);

    routeLayer.current = L.layerGroup().addTo(map);
    markerLayer.current = L.layerGroup().addTo(map);

    map.on("click", (event: L.LeafletMouseEvent) => {
      if (!pickRef.current) return;
      map.panTo(event.latlng, { animate: true });
    });
    map.on("moveend", () => {
      if (!pickRef.current) return;
      const c = map.getCenter();
      pickRef.current({ lat: c.lat, lng: c.lng });
    });

    mapRef.current = map;
    const observer = new ResizeObserver(() => map.invalidateSize());
    observer.observe(host);
    const onFocus = () => map.invalidateSize();
    window.addEventListener("focus", onFocus);

    return () => {
      window.removeEventListener("focus", onFocus);
      observer.disconnect();
      tiles.remove();
      map.remove();
      mapRef.current = null;
      markerLayer.current = null;
      routeLayer.current = null;
      didFit.current = false;
    };
    // The map instance is created once; markers/center changes are handled below.
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || didFit.current) return;
    if (!fitToContent) return;
    const points = [...markers.map((marker) => [marker.lat, marker.lng] as [number, number]), ...routes.flatMap((route) => route.positions)];
    if (points.length > 1) {
      map.fitBounds(L.latLngBounds(points), { padding: [46, 46] });
    } else {
      map.setView(center, zoom);
    }
    didFit.current = true;
  }, [fitToContent, markers, routes, center, zoom]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || fitToContent) return;
    map.setView(center, map.getZoom(), { animate: true });
  }, [center[0], center[1], fitToContent]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    map.getContainer().classList.toggle("is-dark", theme === "dark");
  }, [theme]);

  useEffect(() => {
    const layer = markerLayer.current;
    if (!layer) return;
    layer.clearLayers();
    for (const marker of markers) {
      const leafletMarker = L.marker([marker.lat, marker.lng], {
        icon: iconFor(marker),
        interactive: Boolean(clickRef.current),
        keyboard: Boolean(clickRef.current),
        zIndexOffset: marker.active ? 400 : 0,
      });
      if (clickRef.current) {
        leafletMarker.on("click", (event) => {
          L.DomEvent.stopPropagation(event as unknown as L.LeafletMouseEvent);
          clickRef.current?.(marker.id);
        });
      }
      leafletMarker.addTo(layer);
    }
  }, [markers]);

  useEffect(() => {
    const layer = routeLayer.current;
    if (!layer) return;
    layer.clearLayers();
    for (const route of routes) {
      L.polyline(route.positions, {
        color: route.color ?? "#e8452c",
        weight: route.width ?? 5,
        opacity: 0.95,
        lineCap: "round",
        lineJoin: "round",
        dashArray: route.dashed ? "10 12" : undefined,
      }).addTo(layer);
    }
  }, [routes]);

  return <div ref={hostRef} role="application" aria-label={ariaLabel} className={`leaflet-host ${className}`} />;
}
