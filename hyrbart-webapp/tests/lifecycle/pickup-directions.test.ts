import test from 'node:test';
import assert from 'node:assert/strict';
import { appleMapsDirectionsUrl, canRenterSeePickupLocation, googleMapsDirectionsUrl, hasPickupCoordinates } from '../../lib/pickup-directions.ts';

test('pickup location stays hidden before payment', () => {
  for (const status of ['requested', 'reserved', 'accepted', 'declined', 'cancelled', 'refunded']) {
    assert.equal(canRenterSeePickupLocation(status), false, status);
  }
});

test('pickup location is visible after payment and during/after the rental', () => {
  for (const status of ['paid', 'active', 'returned', 'completed', 'disputed']) {
    assert.equal(canRenterSeePickupLocation(status), true, status);
  }
});

test('map links use the snapshotted coordinates', () => {
  const snapshot = { pickup_location_lat: 59.39712, pickup_location_lng: 18.03654 };
  assert.equal(hasPickupCoordinates(snapshot), true);
  assert.equal(googleMapsDirectionsUrl(snapshot), 'https://www.google.com/maps/dir/?api=1&destination=59.39712%2C18.03654');
  assert.equal(appleMapsDirectionsUrl(snapshot), 'https://maps.apple.com/?daddr=59.39712%2C18.03654&dirflg=d');
});

test('map links are unavailable without complete coordinates', () => {
  const snapshot = { pickup_location_lat: 59.39712, pickup_location_lng: null };
  assert.equal(hasPickupCoordinates(snapshot), false);
  assert.equal(googleMapsDirectionsUrl(snapshot), null);
  assert.equal(appleMapsDirectionsUrl(snapshot), null);
});
