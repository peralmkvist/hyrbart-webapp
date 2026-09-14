import 'server-only';
import { createAdminClient } from '@/lib/supabase/admin';
import { recordCriticalEvent, type CriticalEventName } from '@/lib/critical-events';

const CRITICAL_BOOKING_EVENTS = new Set<CriticalEventName>([
  'booking_created',
  'booking_status_changed',
  'payment_captured',
]);

function criticalIdempotencyKey(bookingId: string, eventType: CriticalEventName, metadata: Record<string, unknown>) {
  if (eventType === 'booking_status_changed') return `${eventType}:${bookingId}:${String(metadata.new_status ?? 'unknown')}`;
  if (eventType === 'payment_captured') return `${eventType}:${bookingId}:${String(metadata.payment_id ?? 'capture')}`;
  return `${eventType}:${bookingId}`;
}

export async function recordBookingEvent({
  bookingId,
  actorId,
  eventType,
  metadata = {},
}: {
  bookingId: string;
  actorId?: string | null;
  eventType: string;
  metadata?: Record<string, unknown>;
}) {
  const admin = createAdminClient();
  const { error } = await admin.from('booking_events').insert({
    booking_id: bookingId,
    actor_id: actorId ?? null,
    event_type: eventType,
    metadata,
  });
  if (error) throw error;

  if (!CRITICAL_BOOKING_EVENTS.has(eventType as CriticalEventName)) return;
  const criticalEvent = eventType as CriticalEventName;
  try {
    await recordCriticalEvent({
      eventName: criticalEvent,
      actorId: actorId ?? null,
      bookingId,
      correlationId: typeof metadata.correlation_id === 'string' ? metadata.correlation_id : null,
      idempotencyKey: criticalIdempotencyKey(bookingId, criticalEvent, metadata),
      properties: metadata,
    });
  } catch (criticalError) {
    console.error('Could not record critical product event', {
      bookingId,
      eventType: criticalEvent,
      error: criticalError instanceof Error ? criticalError.message : String(criticalError),
    });
  }
}
