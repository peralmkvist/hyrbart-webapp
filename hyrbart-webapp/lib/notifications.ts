import 'server-only';
import { createAdminClient } from '@/lib/supabase/admin';
import { sendPushToUser } from '@/lib/push';

type NotifyInput = {
  userId: string;
  bookingId?: string | null;
  type: string;
  title: string;
  body: string;
  url?: string | null;
  eventKey?: string | null;
  metadata?: Record<string, unknown>;
  sendEmail?: boolean;
};

async function sendEmail(userId: string, subject: string, text: string, url?: string | null) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL || 'Hyrbart <hej@hyrbart.se>';
  if (!apiKey) return { status: 'skipped' as const, reason: 'provider_not_configured' };
  const admin = createAdminClient();
  const { data } = await admin.auth.admin.getUserById(userId);
  const email = data.user?.email;
  if (!email) return { status: 'skipped' as const, reason: 'no_email' };
  const absoluteUrl = url ? `${process.env.NEXT_PUBLIC_SITE_URL || 'https://hyrbart.se'}${url.startsWith('/') ? url : `/${url}`}` : null;
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from,
      to: [email],
      subject,
      text: absoluteUrl ? `${text}\n\n${absoluteUrl}` : text,
    }),
  });
  if (!response.ok) throw new Error(`Email delivery failed: ${response.status}`);
  return { status: 'sent' as const };
}

export async function notifyUser(input: NotifyInput) {
  const admin = createAdminClient();
  const row = {
    user_id: input.userId,
    booking_id: input.bookingId ?? null,
    notification_type: input.type,
    title: input.title,
    body: input.body,
    url: input.url ?? null,
    event_key: input.eventKey ?? null,
    metadata: input.metadata ?? {},
  };

  let notification: any = null;
  const { data, error } = await admin.from('user_notifications').insert(row).select('*').maybeSingle();
  if (!error) notification = data;
  else if (error.code === '23505' && input.eventKey) {
    const { data: existing, error: existingError } = await admin.from('user_notifications').select('*').eq('event_key', input.eventKey).maybeSingle();
    if (existingError) throw existingError;
    notification = existing;
  } else throw error;

  if (!notification) return null;

  if (notification.push_status === 'pending') {
    try {
      const push = await sendPushToUser(input.userId, { title: input.title, body: input.body, url: input.url || undefined, tag: input.eventKey || `${input.type}-${notification.id}` });
      await admin.from('user_notifications').update({
        push_status: push.configured ? (push.sent > 0 ? 'sent' : 'skipped') : 'skipped',
        push_sent_at: push.sent > 0 ? new Date().toISOString() : null,
      }).eq('id', notification.id);
    } catch (error) {
      await admin.from('user_notifications').update({ push_status: 'failed' }).eq('id', notification.id);
      console.error('Notification push failed', error);
    }
  }

  if ((input.sendEmail ?? true) && notification.email_status === 'pending') {
    try {
      const email = await sendEmail(input.userId, input.title, input.body, input.url);
      await admin.from('user_notifications').update({
        email_status: email.status,
        email_sent_at: email.status === 'sent' ? new Date().toISOString() : null,
      }).eq('id', notification.id);
    } catch (error) {
      await admin.from('user_notifications').update({ email_status: 'failed' }).eq('id', notification.id);
      console.error('Notification email failed', error);
    }
  }

  return notification;
}

export async function notifyBookingParties({ renterId, ownerId, ...rest }: Omit<NotifyInput, 'userId'> & { renterId: string; ownerId: string }) {
  return Promise.allSettled([
    notifyUser({ ...rest, userId: renterId, eventKey: rest.eventKey ? `${rest.eventKey}:renter` : null }),
    notifyUser({ ...rest, userId: ownerId, eventKey: rest.eventKey ? `${rest.eventKey}:owner` : null }),
  ]);
}
