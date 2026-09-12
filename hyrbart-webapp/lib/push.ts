import 'server-only';
import webpush from 'web-push';
import { createAdminClient } from '@/lib/supabase/admin';

let configured = false;

function configureWebPush() {
  if (configured) return true;
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT || 'mailto:hej@hyrbart.se';
  if (!publicKey || !privateKey) return false;
  webpush.setVapidDetails(subject, publicKey, privateKey);
  configured = true;
  return true;
}

export async function sendPushToUser(userId: string, payload: { title: string; body: string; url?: string; tag?: string }) {
  if (!configureWebPush()) return { sent: 0, configured: false };

  const admin = createAdminClient();
  const { data: subscriptions, error } = await admin
    .from('push_subscriptions')
    .select('id,endpoint,p256dh,auth')
    .eq('user_id', userId);
  if (error || !subscriptions?.length) return { sent: 0, configured: true };

  let sent = 0;
  for (const subscription of subscriptions) {
    try {
      await webpush.sendNotification({
        endpoint: subscription.endpoint,
        keys: { p256dh: subscription.p256dh, auth: subscription.auth },
      }, JSON.stringify(payload));
      sent += 1;
    } catch (err: any) {
      const statusCode = err?.statusCode;
      if (statusCode === 404 || statusCode === 410) {
        await admin.from('push_subscriptions').delete().eq('id', subscription.id);
      } else {
        console.error('Push send failed', err);
      }
    }
  }

  return { sent, configured: true };
}
