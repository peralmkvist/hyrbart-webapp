import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'UNAUTHENTICATED' }, { status: 401 });

  const itemId = new URL(request.url).searchParams.get('itemId');
  if (!itemId) return NextResponse.json({ error: 'ITEM_REQUIRED' }, { status: 400 });

  const { data, error } = await supabase
    .from('listing_import_assets')
    .select('id,item_id,asset_kind,source_filename,storage_path,checksum,rights_confirmed,metadata,created_at')
    .eq('user_id', user.id)
    .eq('item_id', itemId)
    .order('created_at', { ascending: true });

  if (error) return NextResponse.json({ error: 'LOAD_FAILED' }, { status: 500 });
  return NextResponse.json({ assets: data ?? [] }, { headers: { 'cache-control': 'no-store' } });
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'UNAUTHENTICATED' }, { status: 401 });

  let body: any;
  try { body = await request.json(); }
  catch { return NextResponse.json({ error: 'INVALID_REQUEST' }, { status: 400 }); }

  const itemId = String(body.itemId ?? '').trim();
  if (!itemId) return NextResponse.json({ error: 'ITEM_REQUIRED' }, { status: 400 });
  if (body.rightsConfirmed !== true) return NextResponse.json({ error: 'RIGHTS_CONFIRMATION_REQUIRED' }, { status: 400 });

  const { data: item } = await supabase
    .from('listing_import_items')
    .select('id')
    .eq('id', itemId)
    .eq('user_id', user.id)
    .maybeSingle();
  if (!item) return NextResponse.json({ error: 'ITEM_NOT_FOUND' }, { status: 404 });

  const assetKind = body.assetKind === 'document' || body.assetKind === 'other' ? body.assetKind : 'image';
  const sourceFilename = String(body.sourceFilename ?? '').trim() || null;
  const storagePath = String(body.storagePath ?? '').trim() || null;
  const checksum = String(body.checksum ?? '').trim() || null;
  if (!sourceFilename && !storagePath) return NextResponse.json({ error: 'ASSET_REFERENCE_REQUIRED' }, { status: 400 });

  const { data, error } = await supabase
    .from('listing_import_assets')
    .insert({
      item_id: itemId,
      user_id: user.id,
      asset_kind: assetKind,
      source_filename: sourceFilename,
      storage_path: storagePath,
      checksum,
      rights_confirmed: true,
      metadata: body.metadata && typeof body.metadata === 'object' ? body.metadata : {},
    })
    .select('id,item_id,asset_kind,source_filename,storage_path,checksum,rights_confirmed,metadata,created_at')
    .single();

  if (error?.code === '23505') return NextResponse.json({ error: 'DUPLICATE_ASSET' }, { status: 409 });
  if (error || !data) return NextResponse.json({ error: 'ASSET_CREATE_FAILED' }, { status: 500 });
  return NextResponse.json({ asset: data }, { status: 201 });
}
