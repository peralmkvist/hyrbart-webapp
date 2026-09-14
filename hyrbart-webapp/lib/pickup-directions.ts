export type PickupSnapshot = {
  pickup_location_name?: string | null;
  pickup_location_address?: string | null;
  pickup_location_lat?: number | null;
  pickup_location_lng?: number | null;
};

const renterVisibleStatuses = new Set(['paid', 'active', 'returned', 'completed', 'disputed']);

export function canRenterSeePickupLocation(status: string) {
  return renterVisibleStatuses.has(status);
}

export function hasPickupCoordinates(snapshot: PickupSnapshot) {
  return Number.isFinite(snapshot.pickup_location_lat) && Number.isFinite(snapshot.pickup_location_lng);
}

export function googleMapsDirectionsUrl(snapshot: PickupSnapshot) {
  if (!hasPickupCoordinates(snapshot)) return null;
  const destination = `${snapshot.pickup_location_lat},${snapshot.pickup_location_lng}`;
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destination)}`;
}

export function appleMapsDirectionsUrl(snapshot: PickupSnapshot) {
  if (!hasPickupCoordinates(snapshot)) return null;
  const destination = `${snapshot.pickup_location_lat},${snapshot.pickup_location_lng}`;
  return `https://maps.apple.com/?daddr=${encodeURIComponent(destination)}&dirflg=d`;
}
