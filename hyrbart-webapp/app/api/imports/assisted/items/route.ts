import { createHash } from 'crypto';
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value as Record<string, unknown>)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, item]) => [key, canonicalize(item)]));
  }
  return value;
}

function parseOptionalHttpsUrl(value: unknown) {
  const raw = String(value ?? '').trim();
  if (!raw) return null;
  try {
    const url = new URL(raw);
    return url.protocol === 'https:' ? url.toString() : null;
  } catch {
    return null;
  }
}

const allowedConfidence = new Set(['verified', 'user_provided', 'suggested', 'missing']);
const requiredFields = ['title', 'description', 'price', 'category'] as const;

function sanitizeConfidence(value: unknown) {
  if (!value || typeof value !== 'object') return {};
  const result: Record<string, string> = {};
  for (const [key, raw] of Object.entries(value as Record<string, unknown>)) {
    const next = String(raw ?? '');
    if (allowedConfidence.has(next)) result[key] = next;
  }
  return result;
}

function validateReady(normalizedData: Record<string, unknown>, fieldConfidence: Record<string, string>, imageCount: number) {
  const missing: string[] = [];
  for (const field of requiredFields) {
    if (!String(normalizedData[field] ?? '').trim()) missing.push(field);
    else if ((fieldConfidence[field] ?? 'missing') === 'missing') missing.push(`${field}_quality`);
  }
  if (imageCount < 1) missing.push('image');
  return { ready: missing.length === 0, missing };
}

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'UNAUTHENTICATED' }, { status: 401 });

  const batchId = new URL(request.url).searchParams.get('batchId');
  if (!batchId) return NextResponse.json({ error: 'BATCH_REQUIRED' }, { status: 400 });

  const { data, error } = await supabase
    .from('listing_import_items')
    .select('id,batch_id,source_reference,source_url,fingerprint,status,source_payload,normalized_data,field_confidence,error_message,created_at,updated_at')
    .eq('user_id', user.id)
    .eq('batch_id', batchId)
    .order('created_at', { ascending: true });

  if (error) return NextResponse.json({ error: 'LOAD_FAILED' }, { status: 500 });
  return NextResponse.json({ items: data ?? [] }, { headers: { 'cache-control': 'no-store' } });
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'UNAUTHENTICATED' }, { status: 401 });

  let body: any;
  try { body = await request.json(); }
  catch { return NextResponse.json({ error: 'INVALID_REQUEST' }, { status: 400 }); }

  const batchId = String(body.batchId ?? '').trim();
  if (!batchId) return NextResponse.json({ error: 'BATCH_REQUIRED' }, { status: 400 });

  const { data: batch } = await supabase
    .from('listing_import_batches')
    .select('id')
    .eq('id', batchId)
    .eq('user_id', user.id)
    .maybeSingle();
  if (!batch) return NextResponse.json({ error: 'BATCH_NOT_FOUND' }, { status: 404 });

  const sourceReference = String(body.sourceReference ?? '').trim() || null;
  const sourceUrl = parseOptionalHttpsUrl(body.sourceUrl);
  if (body.sourceUrl && !sourceUrl) return NextResponse.json({ error: 'INVALID_SOURCE_URL' }, { status: 400 });

  const sourcePayload = body.sourcePayload && typeof body.sourcePayload === 'object' ? body.sourcePayload : {};
  const normalizedData = body.normalizedData && typeof body.normalizedData === 'object' ? body.normalizedData : {};
  const fingerprintBasis = sourceReference || sourceUrl || JSON.stringify(canonicalize(sourcePayload));
  if (!fingerprintBasis || fingerprintBasis === '{}') {
    return NextResponse.json({ error: 'SOURCE_DATA_REQUIRED' }, { status: 400 });
  }
  const fingerprint = createHash('sha256').update(`${user.id}|${fingerprintBasis}`).digest('hex');

  const { data, error } = await supabase
    .from('listing_import_items')
    .insert({
      batch_id: batchId,
      user_id: user.id,
      source_reference: sourceReference,
      source_url: sourceUrl,
      fingerprint,
      source_payload: sourcePayload,
      normalized_data: normalizedData,
      field_confidence: sanitizeConfidence(body.fieldConfidence),
      status: 'draft',
    })
    .select('id,batch_id,source_reference,source_url,fingerprint,status,source_payload,normalized_data,field_confidence,created_at')
    .single();

  if (error?.code === '23505') {
    const { data: existing } = await supabase
      .from('listing_import_items')
      .select('id,batch_id,status,fingerprint')
      .eq('user_id', user.id)
      .eq('fingerprint', fingerprint)
      .maybeSingle();
    return NextResponse.json({ error: 'DUPLICATE_IMPORT_ITEM', existing }, { status: 409 });
  }
  if (error || !data) return NextResponse.json({ error: 'ITEM_CREATE_FAILED' }, { status: 500 });

  return NextResponse.json({ item: data }, { status: 201 });
}

export async function PATCH(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'UNAUTHENTICATED' }, { status: 401 });

  let body: any;
  try { body = await request.json(); }
  catch { return NextResponse.json({ error: 'INVALID_REQUEST' }, { status: 400 }); }

  const itemId = String(body.itemId ?? '').trim();
  if (!itemId) return NextResponse.json({ error: 'ITEM_REQUIRED' }, { status: 400 });

  const sourceUrl = parseOptionalHttpsUrl(body.sourceUrl);
  if (body.sourceUrl && !sourceUrl) return NextResponse.json({ error: 'INVALID_SOURCE_URL' }, { status: 400 });

  const normalizedData = body.normalizedData && typeof body.normalizedData === 'object' ? body.normalizedData : {};
  const sourceReference = String(body.sourceReference ?? '').trim() || null;
  const fieldConfidence = sanitizeConfidence(body.fieldConfidence);
  const wantsReady = body.status === 'ready';

  let readiness: { ready: boolean; missing: string[] } | null = null;
  if (wantsReady) {
    const { count, error: assetError } = await supabase
      .from('listing_import_assets')
      .select('id', { count: 'exact', head: true })
      .eq('item_id', itemId)
      .eq('user_id', user.id)
      .eq('asset_kind', 'image');
    if (assetError) return NextResponse.json({ error: 'READINESS_CHECK_FAILED' }, { status: 500 });
    readiness = validateReady(normalizedData, fieldConfidence, count ?? 0);
    if (!readiness.ready) {
      return NextResponse.json({ error: 'ITEM_NOT_READY', readiness }, { status: 409 });
    }
  }

  const { data, error } = await supabase
    .from('listing_import_items')
    .update({
      normalized_data: normalizedData,
      source_reference: sourceReference,
      source_url: sourceUrl,
      field_confidence: fieldConfidence,
      status: wantsReady ? 'ready' : 'draft',
      error_message: null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', itemId)
    .eq('user_id', user.id)
    .select('id,batch_id,source_reference,source_url,status,source_payload,normalized_data,field_confidence,created_at,updated_at')
    .maybeSingle();

  if (error) return NextResponse.json({ error: 'ITEM_UPDATE_FAILED' }, { status: 500 });
  if (!data) return NextResponse.json({ error: 'ITEM_NOT_FOUND' }, { status: 404 });
  return NextResponse.json({ item: data, readiness: readiness ?? undefined });
}
