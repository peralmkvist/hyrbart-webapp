import assert from 'node:assert/strict';
import test from 'node:test';
import { bookingStateMachine, canBookingTransition, type BookingActor, type BookingStatus } from '../../lib/booking-state.ts';

const expected: Record<BookingStatus, Partial<Record<BookingStatus, readonly BookingActor[]>>> = {
  requested: { accepted: ['owner'], declined: ['owner'], cancelled: ['renter', 'system'] },
  reserved: { accepted: ['owner'], declined: ['owner'], cancelled: ['renter', 'system'] },
  accepted: { paid: ['renter', 'system'], cancelled: ['renter', 'owner', 'system'] },
  paid: { active: ['renter'], cancelled: ['renter', 'owner'], refunded: ['renter', 'owner', 'admin', 'system'], disputed: ['renter', 'owner', 'admin'] },
  active: { returned: ['renter'], disputed: ['renter', 'owner', 'admin'] },
  returned: { completed: ['owner', 'admin', 'system'], disputed: ['renter', 'owner', 'admin'] },
  completed: { disputed: ['renter', 'owner', 'admin'], refunded: ['admin'] },
  declined: {},
  cancelled: {},
  disputed: { completed: ['admin'], refunded: ['admin'] },
  refunded: {},
};

const actors: BookingActor[] = ['renter', 'owner', 'system', 'admin'];
const statuses = Object.keys(expected) as BookingStatus[];

test('booking state machine matches launch contract exactly', () => {
  assert.deepEqual(bookingStateMachine, expected);
});

test('only explicitly allowed actor transitions are accepted', () => {
  for (const from of statuses) {
    for (const to of statuses) {
      for (const actor of actors) {
        const shouldAllow = Boolean(expected[from][to]?.includes(actor));
        assert.equal(
          canBookingTransition(from, to, actor),
          shouldAllow,
          `${from} -> ${to} by ${actor}`,
        );
      }
    }
  }
});

test('terminal booking states cannot be reopened', () => {
  for (const from of ['declined', 'cancelled', 'refunded'] as BookingStatus[]) {
    for (const to of statuses) {
      for (const actor of actors) {
        assert.equal(canBookingTransition(from, to, actor), false, `${from} -> ${to} by ${actor}`);
      }
    }
  }
});

test('unknown states fail closed', () => {
  assert.equal(canBookingTransition('unknown', 'paid', 'system'), false);
  assert.equal(canBookingTransition('paid', 'unknown', 'admin'), false);
});
