import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateEstimatedHostRevenue, countCompletedRentals, setupProgress } from '../../lib/host-profile-insights.ts';

test('host revenue only counts confirmed rental statuses and subtracts rental refunds', () => {
  const rows = [
    { status: 'requested', rental_price: 500 },
    { status: 'paid', rental_price: 1000 },
    { status: 'active', rental_price: 800, refund_rental_amount: 100 },
    { status: 'completed', rental_price: 600 },
    { status: 'cancelled', rental_price: 900 },
  ];
  assert.equal(calculateEstimatedHostRevenue(rows), 2300);
});

test('completed rentals only count completed bookings', () => {
  assert.equal(countCompletedRentals([{ status: 'returned' }, { status: 'completed' }, { status: 'completed' }]), 2);
});

test('setup progress reflects the four real host requirements', () => {
  assert.deepEqual(setupProgress({ identityReady: true, photoReady: true, payoutReady: false, locationReady: true }), { completed: 3, total: 4, percent: 75 });
});
