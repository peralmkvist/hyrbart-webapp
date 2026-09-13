import { createHash, timingSafeEqual } from 'node:crypto';
import { NextResponse } from 'next/server';
import { processBookingAutomations } from '@/lib/booking-automations';
import { processNotificationMaintenance } from '@/lib/notification-maintenance';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const EXPECTED_SECRET_HASH = '8753ab92a33344e7130496fab91e3eefefcbee2bde959e0471fa3998b7ea0f47';
const RETRY_DELAYS_MS = [250, 750];

function authorized(request: Request) {
  const dedicated = request.headers.get('x-hyrbart-cron-secret')?.trim() || '';
  const authorization = request.headers.get('authorization') || '';
  const provided = dedicated || (authorization.startsWith('Bearer ') ? authorization.slice(7).trim() : '');
  if (!provided) return false;
  const digest = createHash('sha256').update(provided).digest('hex');
  return timingSafeEqual(Buffer.from(digest), Buffer.from(EXPECTED_SECRET_HASH));
}

function isTransient(error: unknown) {
  const message = String((error as { message?: unknown })?.message ?? error);
  return /gateway timeout|timeout|econnreset|bad gateway|service unavailable|\b50[234]\b/i.test(message);
}

async function withTransientRetry<T>(label: string, operation: () => Promise<T>) {
  let lastError: unknown;
  for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      if (!isTransient(error) || attempt === RETRY_DELAYS_MS.length) throw error;
      console.warn(`${label} transient failure, retrying`, { attempt: attempt + 1, message: String((error as { message?: unknown })?.message ?? error) });
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAYS_MS[attempt]));
    }
  }
  throw lastError;
}

export async function POST(request: Request) {
  if (!authorized(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    // Both processors are idempotent: booking actions use automation event keys and
    // notifications use unique event keys. Retrying the whole processor is therefore
    // safer than failing the five-minute cron run on a short Supabase gateway outage.
    const booking = await withTransientRetry('Booking automation', processBookingAutomations);
    const notifications = await withTransientRetry('Notification maintenance', processNotificationMaintenance);
    return NextResponse.json({ ok: true, ...booking, notifications });
  } catch (error) {
    console.error('Automation worker failed', error);
    return NextResponse.json({ error: 'Automation worker failed' }, { status: 500 });
  }
}
