import 'server-only';
import { createAdminClient } from '@/lib/supabase/admin';
import { notifyUser, reconcileEmailDeliveryStatuses, retryFailedNotificationDeliveries } from '@/lib/notifications';

const DAY = 24 * 60 * 60 * 1000;

export async function processNotificationMaintenance() {
  const admin = createAdminClient();
  const now = Date.now();
  const reminderCutoff = new Date(now - DAY).toISOString();
  const oldest = new Date(now - 7 * DAY).toISOString();

  const { data: bookings, error } = await admin.from('bookings')
    .select('id,renter_id,owner_id,completed_at')
    .eq('status','completed')
    .not('completed_at','is',null)
    .lte('completed_at',reminderCutoff)
    .gte('completed_at',oldest)
    .limit(300);
  if (error) throw error;

  let reviewReminders = 0;
  for (const booking of bookings || []) {
    const { data: reviews, error: reviewError } = await admin.from('booking_reviews')
      .select('reviewer_id')
      .eq('booking_id',booking.id);
    if (reviewError) throw reviewError;
    const reviewed = new Set((reviews || []).map(row => row.reviewer_id));
    const participants = [booking.renter_id, booking.owner_id].filter(Boolean) as string[];
    for (const userId of participants) {
      if (reviewed.has(userId)) continue;
      await notifyUser({
        userId,
        bookingId:booking.id,
        type:'review_reminder',
        title:'Hur gick uthyrningen?',
        body:'Lämna gärna ett omdöme medan upplevelsen fortfarande är färsk.',
        url:`/topsecret/sv/bokningar/${booking.id}`,
        eventKey:`review-reminder:${booking.id}:${userId}`,
        sendEmail:false,
      });
      reviewReminders++;
    }
  }

  const emailDelivery = await reconcileEmailDeliveryStatuses(50);
  const retriedDeliveries = await retryFailedNotificationDeliveries(50);
  return { reviewReminders, emailDelivery, retriedDeliveries };
}
