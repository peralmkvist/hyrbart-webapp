import { createHash, randomUUID } from 'crypto';
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

const BUCKET = 'listing-import-assets';
const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ALLOWED_TYPES = new Set(['image/jpeg','image/png','image/webp','image/heic','image/heif','application/pdf']);

function safeFilename(name: string) {
  return name.normalize('NFKD').replace(/[^a-zA-Z0-9._-]+/g,'-').replace(/-+/g,'-').replace(/^-|-$/g,'') || 'file';
}

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

  const assets = await Promise.all((data ?? []).map(async asset => {
    if (!asset.storage_path) return { ...asset, preview_url: null };
    const { data: signed } = await supabase.storage.from(BUCKET).createSignedUrl(asset.storage_path, 900);
    return { ...asset, preview_url: signed?.signedUrl ?? null };
  }));

  return NextResponse.json({ assets }, { headers: { 'cache-control': 'no-store' } });
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'UNAUTHENTICATED' }, { status: 401 });

  let form: FormData;
  try { form = await request.formData(); }
  catch { return NextResponse.json({ error: 'INVALID_REQUEST' }, { status: 400 }); }

  const itemId = String(form.get('itemId') ?? '').trim();
  if (!itemId) return NextResponse.json({ error: 'ITEM_REQUIRED' }, { status: 400 });
  if (String(form.get('rightsConfirmed')) !== 'true') return NextResponse.json({ error: 'RIGHTS_CONFIRMATION_REQUIRED' }, { status: 400 });

  const { data: item } = await supabase
    .from('listing_import_items')
    .select('id')
    .eq('id', itemId)
    .eq('user_id', user.id)
    .maybeSingle();
  if (!item) return NextResponse.json({ error: 'ITEM_NOT_FOUND' }, { status: 404 });

  const file = form.get('file');
  if (!(file instanceof File)) return NextResponse.json({ error: 'FILE_REQUIRED' }, { status: 400 });
  if (file.size <= 0 || file.size > MAX_FILE_SIZE) return NextResponse.json({ error: 'FILE_TOO_LARGE' }, { status: 400 });
  if (!ALLOWED_TYPES.has(file.type)) return NextResponse.json({ error: 'UNSUPPORTED_FILE_TYPE' }, { status: 400 });

  const buffer = Buffer.from(await file.arrayBuffer());
  const checksum = createHash('sha256').update(buffer).digest('hex');
  const cleanName = safeFilename(file.name);
  const storagePath = `${user.id}/${itemId}/${randomUUID()}-${cleanName}`;
  const assetKind = file.type === 'application/pdf' ? 'document' : 'image';

  const { error: uploadError } = await supabase.storage.from(BUCKET).upload(storagePath, buffer, {
    contentType: file.type,
    upsert: false,
  });
  if (uploadError) return NextResponse.json({ error: 'UPLOAD_FAILED' }, { status: 500 });

  const { data, error } = await supabase
    .from('listing_import_assets')
    .insert({
      item_id: itemId,
      user_id: user.id,
      asset_kind: assetKind,
      source_filename: file.name,
      storage_path: storagePath,
      checksum,
      rights_confirmed: true,
      metadata: { content_type: file.type, size: file.size },
    })
    .select('id,item_id,asset_kind,source_filename,storage_path,checksum,rights_confirmed,metadata,created_at')
    .single();

  if (error) {
    await supabase.storage.from(BUCKET).remove([storagePath]);
    if (error.code === '23505') return NextResponse.json({ error: 'DUPLICATE_ASSET' }, { status: 409 });
    return NextResponse.json({ error: 'ASSET_CREATE_FAILED' }, { status: 500 });
  }

  const { data: signed } = await supabase.storage.from(BUCKET).createSignedUrl(storagePath, 900);
  return NextResponse.json({ asset: { ...data, preview_url: signed?.signedUrl ?? null } }, { status: 201 });
}
