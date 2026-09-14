import 'server-only';
import { createAdminClient } from '@/lib/supabase/admin';

export const CRITICAL_EVENT_NAMES = [
  'activation_completed',
  'booking_created',
  'booking_status_changed',
  'payment_captured',
  'deviation_detected',
] as const;

export type CriticalEventName = typeof CRITICAL_EVENT_NAMES[number];

export type CriticalEventContract = {
  owner: 'Product' | 'Engineering' | 'Operations';
  purpose: string;
  requiredProperties: string[];
};

export const CRITICAL_EVENT_CONTRACT: Record<CriticalEventName, CriticalEventContract> = {
  activation_completed: {
    owner: 'Product',
    purpose: 'Measure activated Hyrbart accounts from the server-side profile creation path.',
    requiredProperties: ['account_status'],
  },
  booking_created: {
    owner: 'Product',
    purpose: 'Measure conversion from browsing to a created booking or reservation.',
    requiredProperties: ['status', 'request_type'],
  },
  booking_status_changed: {
    owner: 'Product',
    purpose: 'Measure booking lifecycle transitions and funnel drop-off.',
    requiredProperties: ['previous_status', 'new_status', 'actor_role'],
  },
  payment_captured: {
    owner: 'Engineering',
    purpose: 'Measure successful payment capture and connect it to the booking funnel.',
    requiredProperties: ['provider', 'amount', 'currency', 'simulated'],
  },
  deviation_detected: {
    owner: 'Operations',
    purpose: 'Measure operational deviations that require attention or explain funnel failures.',
    requiredProperties: ['deviation_type', 'source'],
  },
};

function assertContract(eventName: CriticalEventName, properties: Record<string, unknown>) {
  const missing = CRITICAL_EVENT_CONTRACT[eventName].requiredProperties.filter(
    key => properties[key] === undefined,
  );
  if (missing.length) {
    throw new Error(`CRITICAL_EVENT_CONTRACT_MISSING:${eventName}:${missing.join(',')}`);
  }
}

export async function recordCriticalEvent({
  eventName,
  actorId,
  bookingId,
  productId,
  correlationId,
  idempotencyKey,
  properties,
}: {
  eventName: CriticalEventName;
  actorId?: string | null;
  bookingId?: string | null;
  productId?: string | null;
  correlationId?: string | null;
  idempotencyKey?: string | null;
  properties: Record<string, unknown>;
}) {
  assertContract(eventName, properties);
  const admin = createAdminClient();
  const { error } = await admin.from('critical_product_events').insert({
    event_name: eventName,
    event_version: 1,
    actor_id: actorId ?? null,
    booking_id: bookingId ?? null,
    product_id: productId ?? null,
    correlation_id: correlationId ?? null,
    idempotency_key: idempotencyKey ?? null,
    properties,
  });

  if (!error) return;
  if (error.code === '23505' && idempotencyKey) return;
  throw error;
}
