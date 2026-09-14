import 'server-only';
import { createAdminClient } from '@/lib/supabase/admin';
import { sendPushToUser } from '@/lib/push';
import { MANDATORY_IN_APP, NOTIFICATION_POLICY, notificationCategory, type NotificationCategory } from '@/lib/notification-policy';

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

type NotificationPreferences = {
  push_enabled: boolean;
  email_enabled: boolean;
  reminder_enabled: boolean;
  review_enabled: boolean;
  locale: 'sv' | 'en';
};

type DeliveryContext = {
  locale: 'sv' | 'en';
  category: NotificationCategory | null;
  inApp: boolean;
  push: boolean;
  email: boolean;
};

const DEFAULT_PREFERENCES: NotificationPreferences = {
  push_enabled: true,
  email_enabled: true,
  reminder_enabled: true,
  review_enabled: true,
  locale: 'sv',
};

function errorMessage(error: unknown) {
  return String(error instanceof Error ? error.message : (error as { message?: unknown })?.message ?? error).slice(0, 1000);
}

function localizedUrl(url: string | null | undefined, locale: string) {
  if (!url) return null;
  return url
    .replace(/^\/topsecret\/(sv|en)(?=\/|$)/, `/topsecret/${locale}`)
    .replace(/^\/(sv|en)(?=\/|$)/, `/${locale}`);
}

function isReminder(type: string) {
  return type.includes('reminder');
}

function isReviewNotification(type: string) {
  return type.startsWith('review_');
}

async function getLegacyPreferences(userId: string): Promise<NotificationPreferences> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from('notification_preferences')
    .select('push_enabled,email_enabled,reminder_enabled,review_enabled,locale')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw error;
  return data ? { ...DEFAULT_PREFERENCES, ...data } as NotificationPreferences : DEFAULT_PREFERENCES;
}

async function getDeliveryContext(userId: string, type: string): Promise<DeliveryContext> {
  const admin = createAdminClient();
  const category = notificationCategory(type);
  const legacy = await getLegacyPreferences(userId);

  if (!category) {
    const categoryEnabled = (!isReminder(type) || legacy.reminder_enabled)
      && (!isReviewNotification(type) || legacy.review_enabled);
    return {
      locale: legacy.locale,
      category: null,
      inApp: true,
      push: categoryEnabled && legacy.push_enabled,
      email: categoryEnabled && legacy.email_enabled,
    };
  }

  const { data, error } = await admin
    .from('notification_channel_preferences')
    .select('in_app,push,email,sms')
    .eq('user_id', userId)
    .eq('notification_type', category)
    .maybeSingle();
  if (error) throw error;

  const configured = { ...NOTIFICATION_POLICY[category].defaults, ...(data || {}) };
  return {
    locale: legacy.locale,
    category,
    inApp: MANDATORY_IN_APP.has(category) ? true : configured.in_app,
    push: configured.push,
    email: configured.email,
  };
}

async function externalFrequencyLimited(userId: string, category: NotificationCategory | null) {
  if (!category) return false;
  const limit = NOTIFICATION_POLICY[category].maxExternalPer24h;
  if (!limit) return false;
  const admin = createAdminClient();
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { count, error } = await admin
    .from('user_notifications')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .contains('metadata', { preference_category: category })
    .gte('created_at', since)
    .or('push_status.eq.sent,email_status.eq.sent');
  if (error) {
    console.error('Notification frequency check failed', error);
    return false;
  }
  return Number(count || 0) >= limit;
}

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
    body: JSON.stringify({ from, to: [email], subject, text: absoluteUrl ? `${text}\n\n${absoluteUrl}` : text }),
  });
  if (!response.ok) throw new Error(`Email delivery failed: ${response.status}`);
  return { status: 'sent' as const };
}

async function deliverChannel(notification: any, context: DeliveryContext, channel: 'push' | 'email') {
  const admin = createAdminClient();
  const now = new Date().toISOString();
  const attemptsField = channel === 'push' ? 'push_attempts' : 'email_attempts';
  const statusField = channel === 'push' ? 'push_status' : 'email_status';
  const sentAtField = channel === 'push' ? 'push_sent_at' : 'email_sent_at';
  const errorField = channel === 'push' ? 'push_last_error' : 'email_last_error';
  const attempts = Number(notification[attemptsField] || 0) + 1;
  const enabled = channel === 'push' ? context.push : context.email;

  if (!enabled) {
    await admin.from('user_notifications').update({
      [statusField]: 'skipped',
      [attemptsField]: attempts,
      [errorField]: context.category ? 'disabled_by_type_channel_preference' : 'disabled_by_legacy_preference',
      last_delivery_attempt_at: now,
    }).eq('id', notification.id);
    return;
  }

  if (await externalFrequencyLimited(notification.user_id, context.category)) {
    await admin.from('user_notifications').update({
      [statusField]: 'skipped',
      [attemptsField]: attempts,
      [errorField]: 'frequency_limit_24h',
      last_delivery_attempt_at: now,
    }).eq('id', notification.id);
    return;
  }

  try {
    if (channel === 'push') {
      const push = await sendPushToUser(notification.user_id, {
        title: notification.title,
        body: notification.body,
        url: notification.url || undefined,
        tag: notification.event_key || `${notification.notification_type}-${notification.id}`,
      });
      await admin.from('user_notifications').update({
        [statusField]: push.configured ? (push.sent > 0 ? 'sent' : 'skipped') : 'skipped',
        [attemptsField]: attempts,
        [sentAtField]: push.sent > 0 ? now : null,
        [errorField]: push.configured ? (push.sent > 0 ? null : 'no_active_subscription') : 'provider_not_configured',
        last_delivery_attempt_at: now,
      }).eq('id', notification.id);
    } else {
      const email = await sendEmail(notification.user_id, notification.title, notification.body, notification.url);
      await admin.from('user_notifications').update({
        [statusField]: email.status,
        [attemptsField]: attempts,
        [sentAtField]: email.status === 'sent' ? now : null,
        [errorField]: email.status === 'sent' ? null : email.reason,
        last_delivery_attempt_at: now,
      }).eq('id', notification.id);
    }
  } catch (error) {
    await admin.from('user_notifications').update({
      [statusField]: 'failed',
      [attemptsField]: attempts,
      [errorField]: errorMessage(error),
      last_delivery_attempt_at: now,
    }).eq('id', notification.id);
    console.error(`Notification ${channel} failed`, error);
  }
}

export async function notifyUser(input: NotifyInput) {
  const admin = createAdminClient();
  const context = await getDeliveryContext(input.userId, input.type);
  const policy = context.category ? NOTIFICATION_POLICY[context.category] : null;
  const row = {
    user_id: input.userId,
    booking_id: input.bookingId ?? null,
    notification_type: input.type,
    title: input.title,
    body: input.body,
    url: localizedUrl(input.url, context.locale),
    event_key: input.eventKey ?? null,
    metadata: {
      ...(input.metadata ?? {}),
      preference_category: context.category,
      classification: policy?.classification ?? 'legacy',
      priority: policy?.priority ?? 'normal',
      sla_minutes: policy?.slaMinutes ?? null,
    },
    in_app_visible: context.inApp,
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
  if (notification.push_status === 'pending') await deliverChannel(notification, context, 'push');
  if ((input.sendEmail ?? true) && notification.email_status === 'pending') await deliverChannel(notification, context, 'email');
  else if (!(input.sendEmail ?? true) && notification.email_status === 'pending') {
    await admin.from('user_notifications').update({ email_status: 'skipped', email_last_error: 'email_disabled_for_event' }).eq('id', notification.id);
  }
  return notification;
}

export async function retryFailedNotificationDeliveries(limit = 50) {
  const admin = createAdminClient();
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const { data, error } = await admin.from('user_notifications')
    .select('*')
    .gte('created_at', since)
    .or('push_status.eq.failed,email_status.eq.failed')
    .order('created_at', { ascending: true })
    .limit(limit);
  if (error) throw error;
  let retried = 0;
  for (const notification of data || []) {
    const context = await getDeliveryContext(notification.user_id, notification.notification_type);
    if (notification.push_status === 'failed' && Number(notification.push_attempts || 0) < 3) {
      await deliverChannel(notification, context, 'push');
      retried++;
    }
    if (notification.email_status === 'failed' && Number(notification.email_attempts || 0) < 3) {
      await deliverChannel(notification, context, 'email');
      retried++;
    }
  }
  return retried;
}

export async function notifyBookingParties({ renterId, ownerId, ...rest }: Omit<NotifyInput, 'userId'> & { renterId: string; ownerId: string }) {
  return Promise.allSettled([
    notifyUser({ ...rest, userId: renterId, eventKey: rest.eventKey ? `${rest.eventKey}:renter` : null }),
    notifyUser({ ...rest, userId: ownerId, eventKey: rest.eventKey ? `${rest.eventKey}:owner` : null }),
  ]);
}
