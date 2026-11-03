import type { SavedAddress } from "@/lib/account-data";
import { areas, defaultCenter, distanceKm, type Area } from "@/lib/geo";
import type { Lang } from "@/lib/i18n";

/** One searchable target on the delivery map: a saved address or a known district. */
export type Place = {
  key: string;
  title: string;
  subtitle: string;
  lat: number;
  lng: number;
  /** Saved addresses can also become the active delivery address; districts only move the map. */
  saved: boolean;
  addressId?: string;
};

/**
 * Search only offers places inside the delivery range, never a far-away city —
 * otherwise typing "Maadi" would fly the map 180 km from Alexandria.
 */
export const RANGE_LIMIT_KM = 40;

const inRangeAreas: Area[] = areas.filter(
  (area) => distanceKm(defaultCenter, { lat: area.lat, lng: area.lng }) <= RANGE_LIMIT_KM,
);

export const deliveryAreaLabel = (lang: Lang) => (lang === "ar" ? "منطقة توصيل" : "Delivery area");

/**
 * Offline place search shared by every map surface (the delivery picker sheet and
 * the desktop addresses map), so both speak Arabic *and* English and both offer
 * districts as well as the customer's own saved addresses.
 */
export function searchPlaces({
  query,
  addresses,
  lang,
  t,
  limit = 6,
}: {
  query: string;
  addresses: readonly SavedAddress[];
  lang: Lang;
  t: (text: string) => string;
  limit?: number;
}): Place[] {
  const term = query.trim().toLowerCase();
  if (!term) return [];

  // Data is Arabic-first, so a query has to match the stored value and its translation.
  const matches = (value: string) => value.toLowerCase().includes(term) || t(value).toLowerCase().includes(term);

  const fromSaved = addresses
    .filter((item) => [item.title, item.area, item.detail].some(matches))
    .map<Place>((item) => ({
      key: `saved-${item.id}`,
      addressId: item.id,
      title: item.title,
      subtitle: item.detail || item.area,
      lat: item.lat,
      lng: item.lng,
      saved: true,
    }));

  const fromAreas = inRangeAreas
    .filter((area) => matches(area.name) || area.nameEn.toLowerCase().includes(term))
    .map<Place>((area) => ({
      key: `area-${area.id}`,
      title: area.name,
      subtitle: deliveryAreaLabel(lang),
      lat: area.lat,
      lng: area.lng,
      saved: false,
    }));

  return [...fromSaved, ...fromAreas].slice(0, limit);
}
