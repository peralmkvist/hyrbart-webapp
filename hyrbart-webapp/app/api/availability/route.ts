import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

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

async function getOwnerContext() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { supabase, user: null, sanityProfileId: null };
  const admin = createAdminClient();
  const { data: profile } = await admin.from('profiles').select('sanity_profile_id').eq('id', user.id).maybeSingle();
  return { supabase, user, sanityProfileId: profile?.sanity_profile_id || null };
}

export async function GET() {
  try {
    const { supabase, user, sanityProfileId } = await getOwnerContext();
    if (!user) return NextResponse.json({ products: [], blocks: [] }, { status: 401 });
    if (!sanityProfileId) return NextResponse.json({ products: [], blocks: [] });

    const owner = JSON.stringify(sanityProfileId);
    const [products, sanityBlocks] = await Promise.all([
      querySanity<Array<{id:string;label:string}>>(`*[_type == "product" && owner._ref == ${owner} && defined(slug.current) && listingStatus != "deleted"] | order(typeSv asc, brand asc, name asc){"id":_id,"label":array::join([coalesce(typeSv,""),coalesce(brand,""),coalesce(name,"")]," – ")}`),
      querySanity<Array<{id:string;productId:string;from:string;to:string;status:string;note?:string}>>(`*[_type == "availabilityBlock" && product->owner._ref == ${owner}] | order(from asc){"id":_id,"productId":product._ref,from,to,status,note}`),
    ]);

    const { data: rows, error } = await supabase
      .from('bookings')
      .select('id,product_id,start_date,end_date,status,renter_id')
      .eq('owner_id', user.id)
      .in('status', ['requested','reserved','accepted','paid','active','returned']);
    if (error) throw error;

    const renterIds = Array.from(new Set((rows ?? []).map(row => row.renter_id)));
    const { data: renters } = renterIds.length
      ? await supabase.from('profiles').select('id,display_name').in('id', renterIds)
      : { data: [] as Array<{id:string;display_name:string|null}> };
    const renterNames = new Map((renters ?? []).map(renter => [renter.id, renter.display_name || 'Hyrestagare']));

    const bookingBlocks = (rows ?? []).map(row => ({
      id: row.id,
      productId: row.product_id,
      from: row.start_date,
      to: row.end_date,
      status: ['accepted','paid','active','returned'].includes(row.status) ? 'booked' : 'reserved',
      bookingStatus: row.status,
      renterName: renterNames.get(row.renter_id) || 'Hyrestagare',
    }));

    return NextResponse.json({ products, blocks: [...sanityBlocks, ...bookingBlocks] });
  } catch (error) {
    console.error('Availability GET failed', error);
    return NextResponse.json({ error: 'Kunde inte läsa tillgänglighet.' }, { status: 502 });
  }
}

export async function POST(request: Request) {
  const token = process.env.SANITY_API_WRITE_TOKEN;
  if (!token) return NextResponse.json({ error: 'Skrivåtkomst till Sanity är inte konfigurerad.' }, { status: 503 });

  let body: { productId?:string; productIds?:string[]; from?:string; to?:string; status?:string; note?:string };
  try { body = await request.json(); } catch { return NextResponse.json({ error: 'Ogiltig förfrågan.' }, { status: 400 }); }

  const { from, to, status = 'blocked', note = '' } = body;
  const requestedIds = Array.from(new Set([...(Array.isArray(body.productIds) ? body.productIds : []), ...(body.productId ? [body.productId] : [])].filter(Boolean)));
  const datePattern = /^\d{4}-\d{2}-\d{2}$/;
  if (!requestedIds.length || !from || !to || !datePattern.test(from) || !datePattern.test(to) || from > to || !['blocked','service'].includes(status)) {
    return NextResponse.json({ error: 'Ogiltiga uppgifter.' }, { status: 400 });
  }

  try {
    const { user, sanityProfileId } = await getOwnerContext();
    if (!user) return NextResponse.json({ error: 'Inte inloggad.' }, { status: 401 });
    if (!sanityProfileId) return NextResponse.json({ error: 'Uthyrarprofil saknas.' }, { status: 409 });

    const owner = JSON.stringify(sanityProfileId);
    const idsJson = JSON.stringify(requestedIds);
    const ownedProducts = await querySanity<Array<{id:string}>>(`*[_type == "product" && owner._ref == ${owner} && _id in ${idsJson} && listingStatus != "deleted"]{"id":_id}`);
    const ownedIds = new Set(ownedProducts.map(product => product.id));
    if (ownedIds.size !== requestedIds.length) return NextResponse.json({ error: 'En eller flera annonser tillhör inte ditt konto.' }, { status: 403 });

    const mutations = requestedIds.map(productId => ({
      create: {
        _type: 'availabilityBlock',
        product: { _type: 'reference', _ref: productId },
        from,
        to,
        status,
        ...(note.trim() ? { note: note.trim().slice(0, 300) } : {}),
      },
    }));

    const response = await fetch(mutationUrl, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ mutations }),
    });
    const payload = await response.json();
    if (!response.ok) {
      console.error('Sanity mutation failed', payload);
      return NextResponse.json({ error: 'Kunde inte spara blockeringen.' }, { status: 502 });
    }
    return NextResponse.json({ ok: true, count: requestedIds.length });
  } catch (error) {
    console.error('Sanity mutation failed', error);
    return NextResponse.json({ error: 'Kunde inte spara blockeringen.' }, { status: 502 });
  }
}
