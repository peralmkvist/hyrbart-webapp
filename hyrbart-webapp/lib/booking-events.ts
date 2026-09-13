import 'server-only';
import { createAdminClient } from '@/lib/supabase/admin';

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
}
