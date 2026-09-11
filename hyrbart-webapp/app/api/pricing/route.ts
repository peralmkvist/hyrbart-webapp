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

export async function GET() {
  try {
    const products = await querySanity<Array<{id:string;label:string;dailyPrice?:number;multiDayDiscountPercent?:number;weeklyDiscountPercent?:number;repeatCustomerDiscountPercent?:number}>>(`*[_type == "product" && defined(slug.current)] | order(typeSv asc,brand asc,name asc){"id":_id,"label":array::join([coalesce(typeSv,""),coalesce(brand,""),coalesce(name,"")]," – "),dailyPrice,multiDayDiscountPercent,weeklyDiscountPercent,repeatCustomerDiscountPercent}`);
    return NextResponse.json({ products });
  } catch (error) {
    console.error('Pricing GET failed', error);
    return NextResponse.json({ error: 'Kunde inte läsa prisinställningar.' }, { status: 502 });
  }
}

export async function POST(request: Request) {
  const token = process.env.SANITY_API_WRITE_TOKEN;
  if (!token) return NextResponse.json({ error: 'Skrivåtkomst till Sanity är inte konfigurerad.' }, { status: 503 });
  let body: { productId?:string; dailyPrice?:number; multiDayDiscountPercent?:number; weeklyDiscountPercent?:number; repeatCustomerDiscountPercent?:number };
  try { body = await request.json(); } catch { return NextResponse.json({ error: 'Ogiltig förfrågan.' }, { status: 400 }); }
  const productId = body.productId?.trim();
  const cleanNumber = (value: unknown, max = 100000) => typeof value === 'number' && Number.isFinite(value) ? Math.max(0, Math.min(max, value)) : 0;
  if (!productId) return NextResponse.json({ error: 'Välj en annons.' }, { status: 400 });
  const set = {
    dailyPrice: Math.round(cleanNumber(body.dailyPrice)),
    multiDayDiscountPercent: cleanNumber(body.multiDayDiscountPercent, 90),
    weeklyDiscountPercent: cleanNumber(body.weeklyDiscountPercent, 90),
    repeatCustomerDiscountPercent: cleanNumber(body.repeatCustomerDiscountPercent, 90),
  };
  try {
    const response = await fetch(mutationUrl, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ mutations: [{ patch: { id: productId, set } }] }),
    });
    const payload = await response.json();
    if (!response.ok) {
      console.error('Pricing mutation failed', payload);
      return NextResponse.json({ error: 'Kunde inte spara prisinställningarna.' }, { status: 502 });
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Pricing POST failed', error);
    return NextResponse.json({ error: 'Kunde inte spara prisinställningarna.' }, { status: 502 });
  }
}
