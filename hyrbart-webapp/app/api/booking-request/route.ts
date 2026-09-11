import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

const projectId = 'djps09z6';
const dataset = 'production';
const apiVersion = '2026-09-12';
const queryBase = `https://${projectId}.api.sanity.io/v${apiVersion}/data/query/${dataset}`;
const mutationUrl = `https://${projectId}.api.sanity.io/v${apiVersion}/data/mutate/${dataset}`;

async function querySanity<T>(query: string): Promise<T> {
  const response = await fetch(`${queryBase}?query=${encodeURIComponent(query)}`, { cache: 'no-store' });
  if (!response.ok) throw new Error(`Sanity query failed: ${response.status}`);
  const payload = await response.json() as { result: T };
  return payload.result;
}

export async function POST(request: Request) {
  const token = process.env.SANITY_API_WRITE_TOKEN;
  if (!token) return NextResponse.json({ error: 'Skrivåtkomst till Sanity är inte konfigurerad.' }, { status: 503 });

  let body: { slug?: string; from?: string; to?: string; requestType?: 'booking'|'reserve-question'; message?: string };
  try { body = await request.json(); } catch { return NextResponse.json({ error: 'Ogiltig förfrågan.' }, { status: 400 }); }

  const { slug, from, to, requestType = 'booking', message = '' } = body;
  const datePattern = /^\d{4}-\d{2}-\d{2}$/;
  if (!slug || !from || !to || !datePattern.test(from) || !datePattern.test(to) || from > to || !['booking','reserve-question'].includes(requestType)) {
    return NextResponse.json({ error: 'Ogiltiga bokningsuppgifter.' }, { status: 400 });
  }
  if (requestType === 'reserve-question' && !message.trim()) {
    return NextResponse.json({ error: 'Skriv din fråga innan du reserverar.' }, { status: 400 });
  }

  try {
    const safeSlug = JSON.stringify(slug);
    const product = await querySanity<{ id?: string } | null>(`*[_type == "product" && slug.current == ${safeSlug}][0]{"id":_id}`);
    if (!product?.id) return NextResponse.json({ error: 'Annonsen hittades inte.' }, { status: 404 });

    const overlap = await querySanity<number>(`count(*[_type == "availabilityBlock" && product._ref == ${JSON.stringify(product.id)} && from <= ${JSON.stringify(to)} && to >= ${JSON.stringify(from)}])`);
    if (overlap > 0) return NextResponse.json({ error: 'Datumen är inte längre tillgängliga.' }, { status: 409 });

    const bookingDoc = {
      _type: 'bookingRequest',
      product: { _type: 'reference', _ref: product.id },
      from,
      to,
      requestType,
      message: message.trim().slice(0, 2000),
      status: 'pending',
      createdAt: new Date().toISOString(),
    };
    const mutations: Array<Record<string, unknown>> = [{ create: bookingDoc }];

    if (requestType === 'reserve-question') {
      mutations.push({ create: {
        _type: 'availabilityBlock',
        product: { _type: 'reference', _ref: product.id },
        from,
        to,
        status: 'reserved',
        note: `Reservation i väntan på svar: ${message.trim().slice(0, 220)}`,
      }});
    }

    const response = await fetch(mutationUrl, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ mutations }),
    });
    const payload = await response.json();
    if (!response.ok) {
      console.error('Booking mutation failed', payload);
      return NextResponse.json({ error: 'Kunde inte skicka förfrågan.' }, { status: 502 });
    }
    return NextResponse.json({ ok: true, reserved: requestType === 'reserve-question' });
  } catch (error) {
    console.error('Booking request failed', error);
    return NextResponse.json({ error: 'Kunde inte skicka förfrågan.' }, { status: 502 });
  }
}
