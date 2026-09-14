import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

const VERSION = 'privacy-v1';
const SOURCE = 'privacy_settings';
const KEYS = ['product_updates','marketing_push','product_research','marketing_measurement','personalization'] as const;
type Key = typeof KEYS[number];
const DEFAULTS: Record<Key,boolean> = {
  product_updates:false,
  marketing_push:false,
  product_research:false,
  marketing_measurement:false,
  personalization:false,
};
function isKey(value:unknown): value is Key { return KEYS.includes(value as Key); }

export async function GET() {
  const supabase = await createClient();
  const { data:{user} } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({error:'UNAUTHENTICATED'},{status:401});
  const { data, error } = await supabase.from('privacy_preferences')
    .select('product_updates,marketing_push,product_research,marketing_measurement,personalization,consent_version,updated_at')
    .eq('user_id',user.id).maybeSingle();
  if (error) return NextResponse.json({error:'LOAD_FAILED'},{status:500});
  return NextResponse.json({preferences:{...DEFAULTS,...(data||{})},version:VERSION},{headers:{'cache-control':'no-store'}});
}

export async function PATCH(request:Request) {
  const supabase = await createClient();
  const { data:{user} } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({error:'UNAUTHENTICATED'},{status:401});
  const body = await request.json().catch(()=>({}));
  if (!isKey(body.key) || typeof body.enabled !== 'boolean') return NextResponse.json({error:'INVALID_REQUEST'},{status:400});

  const { data:existing } = await supabase.from('privacy_preferences')
    .select('product_updates,marketing_push,product_research,marketing_measurement,personalization')
    .eq('user_id',user.id).maybeSingle();
  const next = {...DEFAULTS,...(existing||{}),[body.key]:body.enabled};
  const { data, error } = await supabase.from('privacy_preferences').upsert({
    user_id:user.id,
    ...next,
    consent_version:VERSION,
    source:SOURCE,
    updated_at:new Date().toISOString(),
  },{onConflict:'user_id'}).select('product_updates,marketing_push,product_research,marketing_measurement,personalization,consent_version,updated_at').single();
  if (error) return NextResponse.json({error:'SAVE_FAILED'},{status:500});

  const { error:auditError } = await supabase.from('privacy_consent_events').insert({
    user_id:user.id,
    preference_key:body.key,
    enabled:body.enabled,
    consent_version:VERSION,
    source:SOURCE,
  });
  if (auditError) return NextResponse.json({error:'AUDIT_FAILED'},{status:500});
  return NextResponse.json({ok:true,preferences:data});
}
