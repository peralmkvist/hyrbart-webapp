export type GeoPoint = { lat: number; lng: number };

export function distanceKm(a: GeoPoint, b: GeoPoint) {
  const earthRadiusKm = 6371;
  const toRad = (value: number) => (value * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * earthRadiusKm * Math.asin(Math.sqrt(h));
}

const fallbackPlaces: Record<string, GeoPoint> = {
  danderyd: { lat: 59.405, lng: 18.0258 },
  stockholm: { lat: 59.3293, lng: 18.0686 },
  solna: { lat: 59.3607, lng: 18.0009 },
  täby: { lat: 59.4439, lng: 18.0687 },
  taby: { lat: 59.4439, lng: 18.0687 },
};

export async function geocodeSwedishPlace(place: string): Promise<GeoPoint | null> {
  const normalized = place.trim().toLocaleLowerCase('sv-SE');
  if (!normalized) return null;
  if (fallbackPlaces[normalized]) return fallbackPlaces[normalized];

  try {
    const params = new URLSearchParams({
      q: `${place}, Sweden`,
      format: 'jsonv2',
      limit: '1',
      countrycodes: 'se',
    });
    const response = await fetch(`https://nominatim.openstreetmap.org/search?${params.toString()}`, {
      headers: { 'User-Agent': 'Hyrbart/0.1 (hyrbart.se)' },
      next: { revalidate: 86400 },
    });
    if (!response.ok) return null;
    const data = (await response.json()) as Array<{ lat: string; lon: string }>;
    const first = data[0];
    if (!first) return null;
    const lat = Number(first.lat);
    const lng = Number(first.lon);
    return Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : null;
  } catch {
    return null;
  }
}
