"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { SavedAddress } from "@/lib/account-data";
import type { LatLng } from "@/lib/geo";
import type { Lang } from "@/lib/i18n";
import { searchPlaces, type Place, type Provider } from "@/lib/place-search";

type GeocoderProperties = {
  name?: string;
  street?: string;
  housenumber?: string;
  district?: string;
  locality?: string;
  city?: string;
  state?: string;
  country?: string;
};

type GeocoderFeature = {
  geometry?: { coordinates?: [number, number] };
  properties?: GeocoderProperties & { osm_id?: number; osm_type?: string };
};

type GeocoderCollection = { features?: GeocoderFeature[] };
let lastGeocoderSearchStarted = 0;

function placeFromFeature(feature: GeocoderFeature, index: number, lang: Lang): Place | null {
  const coordinates = feature.geometry?.coordinates;
  const properties = feature.properties;
  if (!coordinates || !Number.isFinite(coordinates[0]) || !Number.isFinite(coordinates[1])) return null;
  const [lng, lat] = coordinates;
  const title = properties?.name || properties?.street || properties?.city || properties?.state || properties?.country;
  if (!title) return null;
  const subtitle = [properties?.housenumber, properties?.street, properties?.district, properties?.city, properties?.state, properties?.country]
    .filter((part, partIndex, all) => part && all.indexOf(part) === partIndex && part !== title)
    .join(", ");
  const id = properties?.osm_id ? `${properties.osm_type ?? "osm"}-${properties.osm_id}` : `${lat.toFixed(5)}-${lng.toFixed(5)}-${index}`;
  return {
    key: `world-${id}`,
    title,
    subtitle: subtitle || (lang === "ar" ? "نتيجة من OpenStreetMap" : "OpenStreetMap result"),
    lat,
    lng,
    saved: false,
  };
}

async function fetchFeatures(url: URL, signal: AbortSignal): Promise<GeocoderFeature[]> {
  const response = await fetch(url, { signal, headers: { Accept: "application/json" } });
  if (!response.ok) return [];
  const data = (await response.json()) as GeocoderCollection;
  return Array.isArray(data.features) ? data.features : [];
}

async function searchWorldwide(
  query: string,
  lang: Lang,
  signal: AbortSignal,
  provider: Provider,
): Promise<Place[]> {
  const url = new URL("/api/places", window.location.origin);
  url.searchParams.set("q", query);
  url.searchParams.set("limit", "8");
  url.searchParams.set("lang", lang);
  url.searchParams.set("provider", provider);
  const features = await fetchFeatures(url, signal);
  return features.map((feature, index) => placeFromFeature(feature, index, lang)).filter((place): place is Place => place !== null);
}

export function useMapPlaces(
  query: string,
  addresses: readonly SavedAddress[],
  lang: Lang,
  t: (text: string) => string,
) {
  const localPlaces = useMemo(() => searchPlaces({ query, addresses, lang, t }), [addresses, lang, query, t]);
  const [worldPlaces, setWorldPlaces] = useState<Place[]>([]);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    setWorldPlaces([]);
    const term = query.trim();
    if (term.length < 3) {
      setSearching(false);
      return;
    }
    const controller = new AbortController();
    setSearching(true);
    const timer = window.setTimeout(async () => {
      const wait = Math.max(0, 1000 - (Date.now() - lastGeocoderSearchStarted));
      if (wait) await new Promise((resolve) => window.setTimeout(resolve, wait));
      if (controller.signal.aborted) return;
      lastGeocoderSearchStarted = Date.now();
      try {
        setWorldPlaces(await searchWorldwide(term, lang, controller.signal, "nominatim"));
      } catch {
        setWorldPlaces([]);
      } finally {
        if (!controller.signal.aborted) setSearching(false);
      }
    }, 550);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [lang, query]);

  const places = useMemo(() => {
    const keys = new Set(localPlaces.map((place) => `${place.lat.toFixed(4)},${place.lng.toFixed(4)}`));
    const remote = worldPlaces.filter((place) => {
      const coordinateKey = `${place.lat.toFixed(4)},${place.lng.toFixed(4)}`;
      if (keys.has(coordinateKey)) return false;
      keys.add(coordinateKey);
      return true;
    });
    return [...localPlaces, ...remote].slice(0, 10);
  }, [localPlaces, worldPlaces]);

  const searchNow = useCallback(async (term: string) => {
    const local = searchPlaces({ query: term, addresses, lang, t });
    if (local.length) return local;
    if (term.trim().length < 2) return [];
    const controller = new AbortController();
    try {
      const remote = await searchWorldwide(term.trim(), lang, controller.signal, "nominatim");
      setWorldPlaces(remote);
      return remote;
    } catch {
      return [];
    }
  }, [addresses, lang, t]);

  return { places, searchNow, searching };
}

/**
 * Reverse-geocodes a point into a human label. The resolved name is kept per
 * point + language, so disabling the lookup (e.g. moving from the map to the
 * address form) never downgrades a real place name back to the offline guess.
 */
export function useReversePlaceName(point: LatLng, lang: Lang, fallback: string, enabled = true) {
  const [resolved, setResolved] = useState<{ key: string; name: string } | null>(null);
  const key = `${point.lat.toFixed(5)},${point.lng.toFixed(5)},${lang}`;

  useEffect(() => {
    if (!enabled) return;
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      const url = new URL("/api/places", window.location.origin);
      url.searchParams.set("reverse", "1");
      url.searchParams.set("lat", String(point.lat));
      url.searchParams.set("lon", String(point.lng));
      url.searchParams.set("lang", lang);
      void fetchFeatures(url, controller.signal)
        .then((features) => {
          const feature = features[0];
          const place = feature ? placeFromFeature(feature, 0, lang) : null;
          if (place) setResolved({ key, name: [place.title, place.subtitle].filter(Boolean).join(", ") });
        })
        .catch(() => undefined);
    }, 1100);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [enabled, key, lang, point.lat, point.lng]);

  return resolved?.key === key && resolved.name ? resolved.name : fallback;
}
