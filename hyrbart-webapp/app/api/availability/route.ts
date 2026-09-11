import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

const projectId = 'djps09z6';
const dataset = 'production';
const apiVersion = '2026-09-11';
const queryBase = `https://${projectId}.api.sanity.io/v${apiVersion}/data/query/${dataset}`;
const mutationUrl = `https://${projectId}.api.sanity.io/v${apiVersion}/data/mutate/${dataset}`;

async function querySanity<T>(query: string): Promise<T> {
  const response = await fetch(`${queryBase}?query=${encodeURIComponent(query)}`, { cache: 'no-store' });
  if (!response.ok) throw new Error(`Sanity query failed: ${response.status}`);
  const payload = await response.json() as { result: T };
  return payload.result;
}

export async function GET() {
  try {
    const [products, blocks] = await Promise.all([
      querySanity<Array<{id:string;label:string}>>(`*[_type == "product" && defined(slug.current)] | order(typeSv asc, brand asc, name asc){"id":_id,"label":array::join([coalesce(typeSv,""),coalesce(brand,""),coalesce(name,"")]," – ")}`),
      querySanity<Array<{id:string;productId:string;from:string;to:string;status:string;note?:string}>>(`*[_type == "availabilityBlock"] | order(from asc){"id":_id,"productId":product._ref,from,to,status,note}`),
    ]);
    return NextResponse.json({ products, blocks });
  } catch (error) {
    console.error('Availability GET failed', error);
    return NextResponse.json({ error: 'Kunde inte läsa tillgänglighet.' }, { status: 502 });
  }
}

export async function POST(request: Request) {
  const token = process.env.SANITY_API_WRITE_TOKEN;
  if (!token) return NextResponse.json({ error: 'Skrivåtkomst till Sanity är inte konfigurerad.' }, { status: 503 });

  let body: { productId?:string; from?:string; to?:string; status?:string; note?:string };
  try { body = await request.json(); } catch { return NextResponse.json({ error: 'Ogiltig förfrågan.' }, { status: 400 }); }

  const { productId, from, to, status = 'blocked', note = '' } = body;
  const datePattern = /^\d{4}-\d{2}-\d{2}$/;
  if (!productId || !from || !to || !datePattern.test(from) || !datePattern.test(to) || from > to || !['blocked','booked','service'].includes(status)) {
    return NextResponse.json({ error: 'Ogiltiga uppgifter.' }, { status: 400 });
  }

  const doc = {
    _type: 'availabilityBlock',
    product: { _type: 'reference', _ref: productId },
    from,
    to,
    status,
    ...(note.trim() ? { note: note.trim().slice(0, 300) } : {}),
  };

  try {
    const response = await fetch(mutationUrl, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ mutations: [{ create: doc }] }),
    });
    const payload = await response.json();
    if (!response.ok) {
      console.error('Sanity mutation failed', payload);
      return NextResponse.json({ error: 'Kunde inte spara blockeringen.' }, { status: 502 });
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Availability POST failed', error);
    return NextResponse.json({ error: 'Kunde inte spara blockeringen.' }, { status: 502 });
  }
}
