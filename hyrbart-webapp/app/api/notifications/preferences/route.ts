import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

const TYPES = ['follower','booking','booking_update','message','followed_host_listing','favorite_price_change','search_alert','pickup_return_reminder'] as const;
type NotificationType = typeof TYPES[number];
type Channel = 'in_app'|'push'|'email'|'sms';

const OPTIONAL_DEFAULTS: Record<NotificationType,{in_app:boolean;push:boolean;email:boolean;sms:boolean}> = {
  follower:{in_app:true,push:true,email:false,sms:false},
  booking:{in_app:true,push:true,email:true,sms:false},
  booking_update:{in_app:true,push:true,email:true,sms:false},
  message:{in_app:true,push:true,email:false,sms:false},
  followed_host_listing:{in_app:true,push:false,email:false,sms:false},
  favorite_price_change:{in_app:true,push:false,email:false,sms:false},
  search_alert:{in_app:true,push:true,email:false,sms:false},
  pickup_return_reminder:{in_app:true,push:true,email:true,sms:false},
};

const MANDATORY_IN_APP = new Set<NotificationType>(['booking','booking_update','message','pickup_return_reminder']);

function isType(value: unknown): value is NotificationType { return TYPES.includes(value as NotificationType); }
function isChannel(value: unknown): value is Channel { return value === 'in_app' || value === 'push' || value === 'email' || value === 'sms'; }

export async function GET() {
  const supabase = await createClient();
  const { data:{user} } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error:'UNAUTHENTICATED' }, { status:401 });

  const { data, error } = await supabase
    .from('notification_channel_preferences')
    .select('notification_type,in_app,push,email,sms')
    .eq('user_id', user.id);
  if (error) return NextResponse.json({ error:'LOAD_FAILED' }, { status:500 });

  const saved = new Map((data || []).map(row => [row.notification_type, row]));
  const preferences = TYPES.map(type => ({ type, ...OPTIONAL_DEFAULTS[type], ...(saved.get(type) || {}), mandatoryInApp: MANDATORY_IN_APP.has(type) }));
  const admin = createAdminClient();
  const { count: pushSubscriptions } = await admin.from('push_subscriptions').select('endpoint',{count:'exact',head:true}).eq('user_id',user.id);

  return NextResponse.json({
    preferences,
    channels:{
      push:{available:true,active:Boolean(pushSubscriptions)},
      email:{available:Boolean(user.email),active:Boolean(user.email) && Boolean(process.env.RESEND_API_KEY)},
      sms:{available:Boolean(user.phone),active:false},
    },
  }, { headers:{'cache-control':'no-store'} });
}

export async function PATCH(request:Request) {
  const supabase = await createClient();
  const { data:{user} } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error:'UNAUTHENTICATED' }, { status:401 });
  const body = await request.json().catch(()=>({}));
  const type = body.type;
  const channel = body.channel;
  if (!isType(type) || !isChannel(channel) || typeof body.enabled !== 'boolean') {
    return NextResponse.json({ error:'INVALID_REQUEST' }, { status:400 });
  }
  if (channel === 'in_app' && MANDATORY_IN_APP.has(type) && body.enabled === false) {
    return NextResponse.json({ error:'MANDATORY_CHANNEL' }, { status:409 });
  }

  const admin = createAdminClient();
  const { data: existing } = await admin.from('notification_channel_preferences')
    .select('in_app,push,email,sms').eq('user_id',user.id).eq('notification_type',type).maybeSingle();
  const next = { ...OPTIONAL_DEFAULTS[type], ...(existing || {}), [channel]: body.enabled };
  const { data, error } = await admin.from('notification_channel_preferences').upsert({
    user_id:user.id,
    notification_type:type,
    ...next,
    updated_at:new Date().toISOString(),
  },{onConflict:'user_id,notification_type'}).select('notification_type,in_app,push,email,sms').single();
  if (error) return NextResponse.json({ error:'SAVE_FAILED' }, { status:500 });

  await admin.from('notification_preference_audit').insert({user_id:user.id,notification_type:type,channel,enabled:body.enabled});

  // Keep legacy delivery switches compatible while old senders are still in use.
  if (channel === 'push' || channel === 'email') {
    const key = channel === 'push' ? 'push_enabled' : 'email_enabled';
    await admin.from('notification_preferences').upsert({user_id:user.id,[key]:body.enabled,updated_at:new Date().toISOString()},{onConflict:'user_id'});
  }

  return NextResponse.json({ ok:true, preference:data });
}
