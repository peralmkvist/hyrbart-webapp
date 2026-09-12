import { NextResponse } from 'next/server';
import { getProduct } from '@/lib/sanity-products';
import { getAvailabilityConflict } from '@/lib/availability';

export const runtime = 'nodejs';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const slug = searchParams.get('slug') || '';
  const from = searchParams.get('from') || '';
  const to = searchParams.get('to') || from;
  const datePattern = /^\d{4}-\d{2}-\d{2}$/;
  if (!slug || !datePattern.test(from) || !datePattern.test(to) || from > to) {
    return NextResponse.json({ error: 'Ogiltiga datum.' }, { status: 400 });
  }
  try {
    const product = await getProduct(slug);
    if (!product?.id) return NextResponse.json({ error: 'Annonsen hittades inte.' }, { status: 404 });
    const conflict = await getAvailabilityConflict(product.id, from, to);
    return NextResponse.json({ available: !conflict.unavailable, ...conflict });
  } catch (error) {
    console.error('Availability check failed', error);
    return NextResponse.json({ error: 'Kunde inte kontrollera tillgänglighet.' }, { status: 502 });
  }
}
