export const NOTIFICATION_TYPES = [
  'follower',
  'booking',
  'booking_update',
  'message',
  'followed_host_listing',
  'favorite_price_change',
  'search_alert',
  'pickup_return_reminder',
] as const;

export type NotificationCategory = typeof NOTIFICATION_TYPES[number];
export type NotificationChannel = 'in_app' | 'push' | 'email' | 'sms';
export type NotificationClassification = 'transactional' | 'optional_product';

export type NotificationPolicy = {
  classification: NotificationClassification;
  priority: 'critical' | 'high' | 'normal' | 'low';
  recipient: string;
  slaMinutes: number;
  defaults: Record<NotificationChannel, boolean>;
  mandatory: Partial<Record<NotificationChannel, boolean>>;
  maxExternalPer24h: number | null;
  digest: 'none' | 'eligible';
};

export const NOTIFICATION_POLICY: Record<NotificationCategory, NotificationPolicy> = {
  follower: {
    classification: 'optional_product', priority: 'low', recipient: 'Uthyraren som får en ny följare', slaMinutes: 1440,
    defaults: { in_app: true, push: true, email: false, sms: false }, mandatory: {}, maxExternalPer24h: 5, digest: 'eligible',
  },
  booking: {
    classification: 'transactional', priority: 'critical', recipient: 'Relevant uthyrare/hyrestagare', slaMinutes: 2,
    defaults: { in_app: true, push: true, email: true, sms: false }, mandatory: { in_app: true }, maxExternalPer24h: null, digest: 'none',
  },
  booking_update: {
    classification: 'transactional', priority: 'critical', recipient: 'Båda parter eller den part som behöver agera', slaMinutes: 2,
    defaults: { in_app: true, push: true, email: true, sms: false }, mandatory: { in_app: true }, maxExternalPer24h: null, digest: 'none',
  },
  message: {
    classification: 'transactional', priority: 'high', recipient: 'Motparten i bokningstråden', slaMinutes: 5,
    defaults: { in_app: true, push: true, email: false, sms: false }, mandatory: { in_app: true }, maxExternalPer24h: null, digest: 'none',
  },
  followed_host_listing: {
    classification: 'optional_product', priority: 'low', recipient: 'Följare till uthyraren', slaMinutes: 1440,
    defaults: { in_app: true, push: false, email: false, sms: false }, mandatory: {}, maxExternalPer24h: 3, digest: 'eligible',
  },
  favorite_price_change: {
    classification: 'optional_product', priority: 'normal', recipient: 'Användare som favoritmarkerat objektet', slaMinutes: 240,
    defaults: { in_app: true, push: false, email: false, sms: false }, mandatory: {}, maxExternalPer24h: 3, digest: 'eligible',
  },
  search_alert: {
    classification: 'optional_product', priority: 'normal', recipient: 'Ägaren av sökbevakningen', slaMinutes: 60,
    defaults: { in_app: true, push: true, email: false, sms: false }, mandatory: {}, maxExternalPer24h: 3, digest: 'eligible',
  },
  pickup_return_reminder: {
    classification: 'transactional', priority: 'high', recipient: 'Relevant part inför eller efter hämtning/retur', slaMinutes: 5,
    defaults: { in_app: true, push: true, email: true, sms: false }, mandatory: { in_app: true }, maxExternalPer24h: null, digest: 'none',
  },
};

export const MANDATORY_IN_APP = new Set<NotificationCategory>(
  NOTIFICATION_TYPES.filter(type => NOTIFICATION_POLICY[type].mandatory.in_app),
);

export function notificationCategory(type: string): NotificationCategory | null {
  const value = type.toLowerCase();
  if (value.includes('pickup') || value.includes('return') || value.includes('reminder')) return 'pickup_return_reminder';
  if (value.includes('message') || value.includes('chat')) return 'message';
  if (value.includes('followed_host') || value.includes('followed_listing') || value.includes('new_listing_from_followed')) return 'followed_host_listing';
  if (value.includes('follower') || value === 'followed') return 'follower';
  if ((value.includes('favorite') || value.includes('favourite')) && value.includes('price')) return 'favorite_price_change';
  if (value.includes('search_alert') || value.includes('search_watch') || value.includes('saved_search')) return 'search_alert';
  if (value === 'booking_requested' || value === 'booking_request_created' || value === 'new_booking' || value === 'booking_created') return 'booking';
  if (
    value.includes('booking') || value.includes('request_') || value.includes('reservation') || value.includes('payment_') ||
    value.includes('accepted') || value.includes('cancel') || value.includes('expired') || value.includes('paid') ||
    value.includes('active') || value.includes('completed')
  ) return 'booking_update';
  return null;
}
