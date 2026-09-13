import { createHash, timingSafeEqual } from 'node:crypto';
import { NextResponse } from 'next/server';
import { processBookingAutomations } from '@/lib/booking-automations';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const EXPECTED_SECRET_HASH = '8753ab92a33344e7130496fab91e3eefefcbee2bde959e0471fa3998b7ea0f47';

function authorized(request: Request) {
  const dedicated = request.headers.get('x-hyrbart-cron-secret')?.trim() || '';
  const authorization = request.headers.get('authorization') || '';
  const provided = dedicated || (authorization.startsWith('Bearer ') ? authorization.slice(7).trim() : '');
  if (!provided) return false;
  const digest = createHash('sha256').update(provided).digest('hex');
  return timingSafeEqual(Buffer.from(digest), Buffer.from(EXPECTED_SECRET_HASH));
}

export async function POST(request: Request) {
  if (!authorized(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const result = await processBookingAutomations();
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    console.error('Booking automation worker failed', error);
    return NextResponse.json({ error: 'Automation worker failed' }, { status: 500 });
  }
}
