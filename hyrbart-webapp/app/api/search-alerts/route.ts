import { createHash } from 'node:crypto';
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { geocodeSwedishPlace } from '@/lib/geo';

type AlertInput = {
  query?: string;
  category?: string;
  place?: string;
  radius?: number | string;
  from?: string;
  to?: string;
  maxPrice?: number | string;
  minRating?: number | string;
  discountOnly?: boolean;
  locale?: string;
  notificationChannel?: string;
};

function dateValue(value: unknown) {
  const text = String(value || '');
  return /^\d{4}-\d{2}-\d{2}$/.test(text) ? text : '';
}

function canonical(input: AlertInput) {
  const from = dateValue(input.from);
  const to = dateValue(input.to || input.from);
  const radius = Math.max(1, Math.min(50, Number(input.radius || 10) || 10));
  const maxPrice = Number(input.maxPrice || 0) > 0 ? Math.round(Number(input.maxPrice)) : null;
  const minRating = Number(input.minRating || 0) > 0 ? Math.max(0, Math.min(5, Number(input.minRating))) : null;
  return {
    query: String(input.query || '').trim(),
    category: String(input.category || '').trim(),
    place: String(input.place || '').trim(),
    radius,
    from,
    to,
    maxPrice,
    minRating,
    discountOnly: Boolean(input.discountOnly),
    locale: input.locale === 'en' ? 'en' : 'sv',
    notificationChannel: input.notificationChannel === 'in_app' ? 'in_app' : 'in_app_push',
  };
}

function criteriaHash(criteria: ReturnType<typeof canonical>) {
  return createHash('sha256').update(JSON.stringify(criteria)).digest('hex');
}

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'UNAUTHENTICATED' }, { status: 401 });
  const { data, error } = await supabase.from('search_alerts').select('*').eq('user_id', user.id).order('created_at', { ascending: false });
  if (error) return NextResponse.json({ error: 'LOAD_FAILED' }, { status: 500 });
  return NextResponse.json({ alerts: data || [] }, { headers: { 'cache-control': 'no-store' } });
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'UNAUTHENTICATED' }, { status: 401 });
  const body = await request.json().catch(() => ({})) as AlertInput;
  const c = canonical(body);
  if (!c.from || !c.to || c.to < c.from) return NextResponse.json({ error: 'INVALID_DATES' }, { status: 400 });
  if (!c.query && !c.category) return NextResponse.json({ error: 'PRODUCT_CRITERIA_REQUIRED' }, { status: 400 });
  const today = new Date().toISOString().slice(0, 10);
  if (c.from < today) return NextResponse.json({ error: 'PAST_PERIOD' }, { status: 400 });
  const center = c.place ? await geocodeSwedishPlace(c.place) : null;
  if (c.place && !center) return NextResponse.json({ error: 'LOCATION_NOT_FOUND' }, { status: 400 });
  const hash = criteriaHash(c);
  const admin = createAdminClient();
  const { data: existing } = await admin.from('search_alerts').select('*').eq('user_id', user.id).eq('criteria_hash', hash).maybeSingle();
  if (existing) return NextResponse.json({ alert: existing, duplicate: true });
  const { data, error } = await admin.from('search_alerts').insert({
    user_id: user.id,
    query_text: c.query || null,
    category: c.category || null,
    place: c.place || null,
    center_lat: center?.lat ?? null,
    center_lng: center?.lng ?? null,
    radius_km: c.radius,
    start_date: c.from,
    end_date: c.to,
    max_total_price: c.maxPrice,
    min_rating: c.minRating,
    discount_only: c.discountOnly,
    locale: c.locale,
    notification_channel: c.notificationChannel,
    criteria_hash: hash,
  }).select('*').single();
  if (error) return NextResponse.json({ error: 'SAVE_FAILED' }, { status: 500 });
  return NextResponse.json({ alert: data }, { status: 201 });
}

export async function PATCH(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'UNAUTHENTICATED' }, { status: 401 });
  const body = await request.json().catch(() => ({})) as { id?: string; status?: string; maxPrice?: number | string; notificationChannel?: string };
  const id = String(body.id || '');
  if (!id) return NextResponse.json({ error: 'ID_REQUIRED' }, { status: 400 });
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (body.status === 'active' || body.status === 'paused') patch.status = body.status;
  if (body.maxPrice !== undefined) patch.max_total_price = Number(body.maxPrice || 0) > 0 ? Math.round(Number(body.maxPrice)) : null;
  if (body.notificationChannel === 'in_app' || body.notificationChannel === 'in_app_push') patch.notification_channel = body.notificationChannel;
  const { data, error } = await supabase.from('search_alerts').update(patch).eq('id', id).eq('user_id', user.id).select('*').maybeSingle();
  if (error) return NextResponse.json({ error: 'SAVE_FAILED' }, { status: 500 });
  if (!data) return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 });
  return NextResponse.json({ alert: data });
}

export async function DELETE(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'UNAUTHENTICATED' }, { status: 401 });
  const body = await request.json().catch(() => ({})) as { id?: string };
  const id = String(body.id || '');
  if (!id) return NextResponse.json({ error: 'ID_REQUIRED' }, { status: 400 });
  const { error } = await supabase.from('search_alerts').delete().eq('id', id).eq('user_id', user.id);
  if (error) return NextResponse.json({ error: 'DELETE_FAILED' }, { status: 500 });
  return NextResponse.json({ ok: true });
}
