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

type ResendSendResponse = { id?: string };
type ResendEmailResponse = { id?: string; last_event?: string; message_id?: string | null };

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

function externalNotificationCopy(notification: any, context: DeliveryContext) {
  const en = context.locale === 'en';
  const type = String(notification.notification_type || '').toLowerCase();

  // Free-form messages and case descriptions can contain phone numbers, email addresses,
  // physical addresses, filenames or other personal data. Keep the detailed copy inside
  // the authenticated notification center/thread, but never expose it on a lock screen or
  // in an external delivery channel.
  if (context.category === 'message' || type.includes('message') || type.includes('chat')) {
    return {
      title: en ? 'New message on Hyrbart' : 'Nytt meddelande på Hyrbart',
      body: en ? 'Open Hyrbart to read the message.' : 'Öppna Hyrbart för att läsa meddelandet.',
    };
  }
  if (type.startsWith('case_') || type.includes('dispute') || type.includes('damage_case')) {
    return {
      title: en ? 'Update to a rental case' : 'Uppdatering i ett uthyrningsärende',
      body: en ? 'Open Hyrbart to view the case securely.' : 'Öppna Hyrbart för att läsa ärendet säkert.',
    };
  }
  return { title: notification.title, body: notification.body };
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
    .or('push_status.eq.sent,email_status.eq.sent,email_status.eq.delivered');
  if (error) {
    console.error('Notification frequency check failed');
    return false;
  }
  return Number(count || 0) >= limit;
}

async function sendEmail(userId: string, subject: string, text: string, url?: string | null, idempotencyKey?: string | null) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL || 'Hyrbart <hej@hyrbart.se>';
  if (!apiKey) return { status: 'skipped' as const, reason: 'provider_not_configured', providerId: null };
  const admin = createAdminClient();
  const { data } = await admin.auth.admin.getUserById(userId);
  const email = data.user?.email;
  if (!email) return { status: 'skipped' as const, reason: 'no_email', providerId: null };
  const absoluteUrl = url ? `${process.env.NEXT_PUBLIC_SITE_URL || 'https://hyrbart.se'}${url.startsWith('/') ? url : `/${url}`}` : null;
  const headers: Record<string,string> = { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' };
  if (idempotencyKey) headers['Idempotency-Key'] = `hyrbart-notification/${idempotencyKey}`.slice(0, 256);
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers,
    body: JSON.stringify({ from, to: [email], subject, text: absoluteUrl ? `${text}\n\n${absoluteUrl}` : text }),
  });
  if (!response.ok) throw new Error(`Email delivery failed: ${response.status}`);
  const payload = await response.json().catch(() => ({})) as ResendSendResponse;
  return { status: 'sent' as const, providerId: payload.id || null };
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

  const external = externalNotificationCopy(notification, context);
  try {
    if (channel === 'push') {
      const push = await sendPushToUser(notification.user_id, {
        title: external.title,
        body: external.body,
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
      const email = await sendEmail(notification.user_id, external.title, external.body, notification.url, notification.event_key || notification.id);
      await admin.from('user_notifications').update({
        [statusField]: email.status,
        [attemptsField]: attempts,
        [sentAtField]: email.status === 'sent' ? now : null,
        [errorField]: email.status === 'sent' ? null : email.reason,
        email_provider_id: email.providerId,
        email_last_event: email.status === 'sent' ? 'sent' : null,
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
    console.error(`Notification ${channel} failed`);
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

export async function reconcileEmailDeliveryStatuses(limit = 50) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return { checked: 0, delivered: 0, terminalFailed: 0, delayed: 0 };
  const admin = createAdminClient();
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const { data, error } = await admin.from('user_notifications')
    .select('id,email_provider_id,email_status,email_last_event,email_delivered_at,email_terminal_failed_at')
    .not('email_provider_id','is',null)
    .gte('created_at', since)
    .in('email_status',['sent','delivered'])
    .order('created_at',{ascending:true})
    .limit(limit);
  if (error) throw error;

  let checked = 0, delivered = 0, terminalFailed = 0, delayed = 0;
  for (const notification of data || []) {
    const response = await fetch(`https://api.resend.com/emails/${encodeURIComponent(notification.email_provider_id)}`, {
      headers: { Authorization: `Bearer ${apiKey}` },
      cache: 'no-store',
    });
    if (!response.ok) {
      if (response.status >= 500) throw new Error(`Email status lookup failed: ${response.status}`);
      await admin.from('user_notifications').update({ email_last_error:`provider_status_lookup_${response.status}` }).eq('id',notification.id);
      checked++;
      continue;
    }
    const provider = await response.json() as ResendEmailResponse;
    const event = String(provider.last_event || 'sent').toLowerCase();
    const now = new Date().toISOString();
    const update: Record<string,unknown> = { email_last_event:event, email_last_error:null };

    if (event === 'delivered' || event === 'opened' || event === 'clicked') {
      update.email_status = 'delivered';
      update.email_delivered_at = notification.email_delivered_at || now;
      delivered++;
    } else if (event === 'bounced' || event === 'complained' || event === 'failed' || event === 'suppressed') {
      update.email_status = 'terminal_failed';
      update.email_terminal_failed_at = notification.email_terminal_failed_at || now;
      update.email_last_error = `provider_${event}`;
      terminalFailed++;
    } else if (event === 'delivery_delayed') {
      delayed++;
    }

    await admin.from('user_notifications').update(update).eq('id', notification.id);
    checked++;
  }
  return { checked, delivered, terminalFailed, delayed };
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
