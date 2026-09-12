import { NextResponse } from 'next/server';
import { getProduct } from '@/lib/sanity-products';
import { getAvailabilityConflict } from '@/lib/availability';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  let body: { slug?: string; from?: string; to?: string } & Record<string, unknown>;
  try { body = await request.json(); } catch { return NextResponse.json({ error: 'Ogiltig förfrågan.' }, { status: 400 }); }
  const { slug, from, to } = body;
  const datePattern = /^\d{4}-\d{2}-\d{2}$/;
  if (!slug || !from || !to || !datePattern.test(from) || !datePattern.test(to) || from > to) {
    return NextResponse.json({ error: 'Ogiltiga bokningsuppgifter.' }, { status: 400 });
  }
  try {
    const product = await getProduct(slug);
    if (!product?.id) return NextResponse.json({ error: 'Annonsen hittades inte.' }, { status: 404 });
    const conflict = await getAvailabilityConflict(product.id, from, to);
    if (conflict.unavailable) return NextResponse.json({ error: 'Datumen är inte längre tillgängliga.', code: 'DATES_UNAVAILABLE' }, { status: 409 });

    // The database also has an exclusion constraint for active booking periods. This
    // second server-side check handles host-created Sanity blocks before the existing
    // booking endpoint performs pricing, ownership and payment-method validation.
    const url = new URL('/api/booking-request', request.url);
    const headers = new Headers();
    const cookie = request.headers.get('cookie');
    if (cookie) headers.set('cookie', cookie);
    headers.set('content-type', 'application/json');
    const response = await fetch(url, { method: 'POST', headers, body: JSON.stringify(body), cache: 'no-store' });
    const text = await response.text();
    return new NextResponse(text, { status: response.status, headers: { 'content-type': response.headers.get('content-type') || 'application/json' } });
  } catch (error) {
    console.error('Safe booking request failed', error);
    return NextResponse.json({ error: 'Kunde inte kontrollera tillgänglighet.' }, { status: 502 });
  }
}
