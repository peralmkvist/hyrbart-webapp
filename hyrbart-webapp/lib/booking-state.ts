export type BookingStatus =
  | 'requested'
  | 'reserved'
  | 'accepted'
  | 'paid'
  | 'active'
  | 'returned'
  | 'completed'
  | 'declined'
  | 'cancelled'
  | 'disputed'
  | 'refunded';

export type BookingActor = 'renter' | 'owner' | 'system' | 'admin';

const transitions: Record<BookingStatus, Partial<Record<BookingStatus, readonly BookingActor[]>>> = {
  requested: {
    accepted: ['owner'],
    declined: ['owner'],
    cancelled: ['renter'],
  },
  reserved: {
    accepted: ['owner'],
    declined: ['owner'],
    cancelled: ['renter', 'system'],
  },
  accepted: {
    paid: ['renter', 'system'],
    cancelled: ['renter', 'owner'],
  },
  paid: {
    active: ['renter'],
    cancelled: ['renter', 'owner'],
    refunded: ['renter', 'owner', 'admin', 'system'],
    disputed: ['renter', 'owner', 'admin'],
  },
  active: {
    returned: ['renter'],
    disputed: ['renter', 'owner', 'admin'],
  },
  returned: {
    completed: ['owner', 'admin'],
    disputed: ['renter', 'owner', 'admin'],
  },
  completed: {
    disputed: ['renter', 'owner', 'admin'],
    refunded: ['admin'],
  },
  declined: {},
  cancelled: {},
  disputed: {
    completed: ['admin'],
    refunded: ['admin'],
  },
  refunded: {},
};

export function canBookingTransition(from: string, to: string, actor: BookingActor) {
  const allowed = transitions[from as BookingStatus]?.[to as BookingStatus];
  return Boolean(allowed?.includes(actor));
}

export function bookingTransitionReason(from: string, to: string, actor: BookingActor) {
  return `${from}:${to}:${actor}`;
}

export const bookingStateMachine = transitions;
