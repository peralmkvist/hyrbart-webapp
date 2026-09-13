import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

const DEFAULTS = { push_enabled:true, email_enabled:true, reminder_enabled:true, review_enabled:true, locale:'sv' };

export async function GET() {
  const supabase = await createClient();
  const { data:{user} } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error:'UNAUTHENTICATED' }, { status:401 });
  const { data, error } = await supabase.from('notification_preferences').select('push_enabled,email_enabled,reminder_enabled,review_enabled,locale').eq('user_id', user.id).maybeSingle();
  if (error) return NextResponse.json({ error:'LOAD_FAILED' }, { status:500 });
  return NextResponse.json({ preferences:{ ...DEFAULTS, ...(data||{}) }, emailProviderConfigured:Boolean(process.env.RESEND_API_KEY) });
}

export async function PATCH(request:Request) {
  const supabase = await createClient();
  const { data:{user} } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error:'UNAUTHENTICATED' }, { status:401 });
  const body = await request.json().catch(()=>({}));
  const locale = body.locale === 'en' ? 'en' : 'sv';
  const payload = {
    user_id:user.id,
    push_enabled:body.push_enabled !== false,
    email_enabled:body.email_enabled !== false,
    reminder_enabled:body.reminder_enabled !== false,
    review_enabled:body.review_enabled !== false,
    locale,
    updated_at:new Date().toISOString(),
  };
  const admin = createAdminClient();
  const { data, error } = await admin.from('notification_preferences').upsert(payload,{onConflict:'user_id'}).select('push_enabled,email_enabled,reminder_enabled,review_enabled,locale').single();
  if (error) return NextResponse.json({ error:'SAVE_FAILED' }, { status:500 });
  return NextResponse.json({ ok:true, preferences:data });
}
