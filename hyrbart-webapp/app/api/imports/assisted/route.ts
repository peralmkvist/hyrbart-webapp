import { createHash } from 'crypto';
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

const CONSENT_VERSION = 'assisted-import-v1';
const CONSENT_TEXT = 'Jag ber Hyrbart att behandla material som jag själv tillhandahåller för att skapa redigerbara annonsutkast. Importen publicerar inget automatiskt och innebär inte att Hyrbart får hämta data från tredjepartstjänster utan separat stöd.';

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

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'UNAUTHENTICATED' }, { status: 401 });

  const { data, error } = await supabase
    .from('listing_import_batches')
    .select('id,source_platform,source_profile_url,status,created_at,updated_at,listing_import_consents(consent_version,accepted_at,scope)')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: 'LOAD_FAILED' }, { status: 500 });
  return NextResponse.json({ batches: data ?? [] }, { headers: { 'cache-control': 'no-store' } });
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'UNAUTHENTICATED' }, { status: 401 });

  let body: any;
  try { body = await request.json(); }
  catch { return NextResponse.json({ error: 'INVALID_REQUEST' }, { status: 400 }); }

  if (body.consentAccepted !== true) {
    return NextResponse.json({ error: 'CONSENT_REQUIRED' }, { status: 400 });
  }

  const sourcePlatform = body.sourcePlatform === 'hygglo' || body.sourcePlatform === 'other'
    ? body.sourcePlatform
    : 'user_provided';
  const sourceProfileUrl = parseOptionalHttpsUrl(body.sourceProfileUrl);
  if (body.sourceProfileUrl && !sourceProfileUrl) {
    return NextResponse.json({ error: 'INVALID_SOURCE_PROFILE_URL' }, { status: 400 });
  }

  const { data: batch, error: batchError } = await supabase
    .from('listing_import_batches')
    .insert({ user_id: user.id, source_platform: sourcePlatform, source_profile_url: sourceProfileUrl })
    .select('id,source_platform,source_profile_url,status,created_at')
    .single();

  if (batchError || !batch) return NextResponse.json({ error: 'BATCH_CREATE_FAILED' }, { status: 500 });

  const consentTextHash = createHash('sha256').update(CONSENT_TEXT).digest('hex');
  const { error: consentError } = await supabase.from('listing_import_consents').insert({
    batch_id: batch.id,
    user_id: user.id,
    consent_version: CONSENT_VERSION,
    consent_text_hash: consentTextHash,
    scope: ['listing_content', 'listing_images'],
  });

  if (consentError) {
    await supabase.from('listing_import_batches').delete().eq('id', batch.id).eq('user_id', user.id);
    return NextResponse.json({ error: 'CONSENT_SAVE_FAILED' }, { status: 500 });
  }

  return NextResponse.json({ batch, consentVersion: CONSENT_VERSION }, { status: 201 });
}
