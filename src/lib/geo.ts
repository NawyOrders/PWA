export type LatLng = { lat: number; lng: number };

export type Area = {
  id: string;
  name: string;
  nameEn: string;
  lat: number;
  lng: number;
};

/** Districts around the restaurant's delivery range, used to label a picked pin. */
export const areas: Area[] = [
  { id: "smouha", name: "سموحة", nameEn: "Smouha", lat: 31.1939, lng: 29.9216 },
  { id: "nadi-alsayd", name: "عزبة نادي الصيد", nameEn: "Ezbet Nadi Al Sayd", lat: 31.1861, lng: 29.9442 },
  { id: "karmous", name: "كرموس", nameEn: "Karmous", lat: 31.1906, lng: 29.9131 },
  { id: "sidi-bishr", name: "سيدي بشر", nameEn: "Sidi Bishr", lat: 31.2139, lng: 29.9611 },
  { id: "mansheya", name: "المنشية", nameEn: "Mansheya", lat: 31.2064, lng: 29.9336 },
  { id: "al-iptamarat", name: "الإبتسامات", nameEn: "Al Iptamarat", lat: 31.2011, lng: 29.9558 },
  { id: "roshdy", name: "رشدي", nameEn: "Roshdy", lat: 31.2028, lng: 29.9769 },
  { id: "zanqu", name: "الزند", nameEn: "Al Zond", lat: 31.1792, lng: 29.9286 },
  { id: "agami", name: "العجمي", nameEn: "Agami", lat: 31.2753, lng: 29.8764 },
  { id: "matar", name: "المنتزه", nameEn: "Montaza", lat: 31.2689, lng: 30.0114 },
  { id: "nakheel", name: "حي النخيل", nameEn: "Al Nakheel", lat: 31.1714, lng: 29.8931 },
  { id: "greenfl", name: "جرينفل", nameEn: "Greefnfl", lat: 31.1972, lng: 29.9046 },
  { id: "ibrahia", name: "الإبراهيمية", nameEn: "Ibrahimia", lat: 31.1836, lng: 29.9119 },
  { id: "hadra", name: "الحضرة", nameEn: "Hadra", lat: 31.1706, lng: 29.9203 },
  { id: "port", name: "الميناء الشرقي", nameEn: "East Port", lat: 31.1642, lng: 29.9053 },
  { id: "maadi", name: "المعادي", nameEn: "Maadi", lat: 29.9603, lng: 31.2569 },
];

const EARTH_RADIUS_KM = 6371;

function toRadians(value: number) {
  return (value * Math.PI) / 180;
}

export function distanceKm(from: LatLng, to: LatLng) {
  const dLat = toRadians(to.lat - from.lat);
  const dLng = toRadians(to.lng - from.lng);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(from.lat)) * Math.cos(toRadians(to.lat)) * Math.sin(dLng / 2) ** 2;
  return EARTH_RADIUS_KM * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/** Nearest known district for a coordinate — keeps pin labelling offline and deterministic. */
export function nearestArea(point: LatLng): Area {
  let best = areas[0];
  let bestDistance = Number.POSITIVE_INFINITY;
  for (const area of areas) {
    const distance = distanceKm(point, area);
    if (distance < bestDistance) {
      best = area;
      bestDistance = distance;
    }
  }
  return best;
}

export function areaName(point: LatLng, lang: "ar" | "en") {
  const area = nearestArea(point);
  return lang === "ar" ? area.name : area.nameEn;
}

export function formatCoords(point: LatLng) {
  return `${point.lat.toFixed(4)},${point.lng.toFixed(4)}`;
}

/** Alexandria city centre — the map's default view. */
export const defaultCenter: LatLng = { lat: 31.1861, lng: 29.9336 };
