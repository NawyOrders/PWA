import { NextResponse } from "next/server";

type Provider = "nominatim" | "photon";

const PROVIDERS: Provider[] = ["nominatim", "photon"];

// Nominatim's usage policy requires an identifying User-Agent; Photon asks for one too.
const USER_AGENT = process.env.GEOCODER_USER_AGENT ?? "Nawy-Order-PWA/1.0";

const NOMINATIM_UA = "https://nominatim.openstreetmap.org";
const PHOTON_UA = "https://photon.komoot.io";

// Soft regional bias (lon,top,lon,bottom around Egypt): "Cairo" answers with Cairo, Egypt instead of
// the eight US villages that share the name. World cities are still returned, only ranked lower.
const PREFERRED_VIEWBOX = "24.5,32.0,35.5,21.5";

type GeoJsonFeature = {
  type: "Feature";
  geometry: { type: "Point"; coordinates: [number, number] };
  properties: Record<string, string | number | undefined>;
};

type GeoJsonCollection = { features: GeoJsonFeature[] };

/** Nominatim jsonv2 item: only the fields the adapter reads. */
type NominatimHit = {
  name?: string;
  display_name?: string;
  lat?: string;
  lon?: string;
  osm_id?: number;
  osm_type?: string;
  importance?: number;
  address?: Record<string, string>;
};

function normalizeNominatim(raw: unknown, provider: Provider): GeoJsonFeature[] {
  // search answers with an array, reverse with a single object.
  const hits = Array.isArray(raw) ? raw : raw && typeof raw === "object" ? [raw] : [];
  const features: GeoJsonFeature[] = [];
  for (const hit of hits as NominatimHit[]) {
    const lat = Number(hit.lat);
    const lon = Number(hit.lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) continue;
    const address = hit.address ?? {};
    const title =
      hit.name || address.city || address.town || address.village || address.state || address.country || hit.display_name;
    if (!title) continue;
    features.push({
      type: "Feature",
      geometry: { type: "Point", coordinates: [lon, lat] },
      properties: {
        name: title,
        street: address.road,
        housenumber: address.house_number,
        district: address.neighbourhood ?? address.suburb ?? address.city_district,
        city: address.city ?? address.town ?? address.village ?? address.municipality,
        state: address.state ?? address.region,
        country: address.country,
        osm_id: hit.osm_id,
        osm_type: hit.osm_type,
        importance: hit.importance ?? 0,
        provider,
      },
    });
  }
  return features;
}

function normalizePhoton(raw: unknown, provider: Provider): GeoJsonFeature[] {
  const features = (raw as { features?: unknown[] })?.features;
  if (!Array.isArray(features)) return [];
  return features.flatMap((feature): GeoJsonFeature[] => {
    const item = feature as GeoJsonFeature & { properties?: Record<string, unknown> };
    const coordinates = item.geometry?.coordinates;
    if (!Array.isArray(coordinates) || coordinates.length < 2) return [];
    const lat = Number(coordinates[1]);
    const lon = Number(coordinates[0]);
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) return [];
    return [
      {
        type: "Feature",
        geometry: { type: "Point", coordinates: [lon, lat] },
        properties: { ...item.properties, lat, lon, importance: Number(item.properties?.importance ?? 0), provider },
      },
    ];
  });
}

/** Nominatim returns hamlets with the same name before the real capital, so rank by importance. */
function rank(features: GeoJsonFeature[]): GeoJsonFeature[] {
  const seen = new Set<string>();
  return [...features]
    .sort((a, b) => Number(b.properties.importance ?? 0) - Number(a.properties.importance ?? 0))
    .filter((feature) => {
      const key = `${feature.properties.name ?? ""}|${feature.geometry.coordinates.join(",")}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

async function callNominatim({
  reverse,
  lat,
  lon,
  query,
  lang,
  signal,
  viewbox,
}: {
  reverse: boolean;
  lat: number;
  lon: number;
  query: string;
  lang: string;
  signal: AbortSignal;
  viewbox: string;
}): Promise<GeoJsonFeature[]> {
  const url = new URL(reverse ? `${NOMINATIM_UA}/reverse` : `${NOMINATIM_UA}/search`);
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("addressdetails", "1");
  if (reverse) {
    url.searchParams.set("lat", String(lat));
    url.searchParams.set("lon", String(lon));
    url.searchParams.set("zoom", "14");
  } else {
    url.searchParams.set("q", query);
    url.searchParams.set("limit", "10");
    if (viewbox) url.searchParams.set("viewbox", viewbox);
  }
  const response = await fetch(url, {
    headers: { "User-Agent": USER_AGENT, Accept: "application/json", "Accept-Language": lang },
    signal,
    next: { revalidate: 3600 },
  });
  if (!response.ok) throw new Error(`nominatim ${response.status}`);
  return normalizeNominatim(await response.json(), "nominatim");
}

async function callPhoton({
  reverse,
  lat,
  lon,
  query,
  lang,
  signal,
}: {
  reverse: boolean;
  lat: number;
  lon: number;
  query: string;
  lang: string;
  signal: AbortSignal;
}): Promise<GeoJsonFeature[]> {
  const url = new URL(reverse ? `${PHOTON_UA}/api/reverse` : `${PHOTON_UA}/api/`);
  if (reverse) {
    url.searchParams.set("lat", String(lat));
    url.searchParams.set("lon", String(lon));
  } else {
    url.searchParams.set("q", query);
    url.searchParams.set("limit", "10");
  }
  // Photon ships no Arabic data, so only request a language it can honour.
  if (lang.startsWith("en")) url.searchParams.set("lang", "en");
  const response = await fetch(url, {
    headers: { "User-Agent": USER_AGENT, Accept: "application/json" },
    signal,
    next: { revalidate: 3600 },
  });
  if (!response.ok) throw new Error(`photon ${response.status}`);
  return normalizePhoton(await response.json(), "photon");
}

const CALLERS = { nominatim: callNominatim, photon: callPhoton } as const;

function providerList(requested: string | null): Provider[] {
  const preferred = PROVIDERS.includes(requested as Provider) ? (requested as Provider) : "nominatim";
  return [preferred, ...PROVIDERS.filter((provider) => provider !== preferred)];
}

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const reverse = params.get("reverse") === "1";
  const lat = Number(params.get("lat"));
  const lon = Number(params.get("lon"));
  const query = params.get("q")?.trim() ?? "";
  const lang = params.get("lang") === "en" ? "en" : "ar";

  if (reverse && (!Number.isFinite(lat) || !Number.isFinite(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180)) {
    return NextResponse.json({ error: "Invalid coordinates" }, { status: 400 });
  }
  if (!reverse && (query.length < 2 || query.length > 120)) {
    return NextResponse.json({ error: "Search query must be between 2 and 120 characters" }, { status: 400 });
  }

  const signal = AbortSignal.timeout(12000);
  const args = { reverse, lat, lon, query, lang, signal, viewbox: PREFERRED_VIEWBOX };
  const failures: string[] = [];

  for (const provider of providerList(params.get("provider"))) {
    try {
      const features = rank(await CALLERS[provider](args));
      const body: GeoJsonCollection = { features };
      return NextResponse.json(body, {
        headers: { "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400" },
      });
    } catch (error) {
      // A provider that answers with no hits is still an answer; only unreachable ones fall through.
      failures.push(`${provider}: ${error instanceof Error ? error.message : "unknown"}`);
    }
  }

  return NextResponse.json(
    { features: [], error: "Place search is temporarily unavailable", details: failures },
    { status: 502 }
  );
}
