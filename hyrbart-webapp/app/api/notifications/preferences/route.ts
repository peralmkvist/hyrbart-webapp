import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { MANDATORY_IN_APP, NOTIFICATION_POLICY, NOTIFICATION_TYPES, type NotificationCategory, type NotificationChannel } from '@/lib/notification-policy';

function isType(value: unknown): value is NotificationCategory { return NOTIFICATION_TYPES.includes(value as NotificationCategory); }
function isChannel(value: unknown): value is NotificationChannel { return value === 'in_app' || value === 'push' || value === 'email' || value === 'sms'; }

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
  const preferences = NOTIFICATION_TYPES.map(type => ({
    type,
    ...NOTIFICATION_POLICY[type].defaults,
    ...(saved.get(type) || {}),
    mandatoryInApp: MANDATORY_IN_APP.has(type),
    classification: NOTIFICATION_POLICY[type].classification,
    priority: NOTIFICATION_POLICY[type].priority,
    slaMinutes: NOTIFICATION_POLICY[type].slaMinutes,
    recipient: NOTIFICATION_POLICY[type].recipient,
    maxExternalPer24h: NOTIFICATION_POLICY[type].maxExternalPer24h,
    digest: NOTIFICATION_POLICY[type].digest,
  }));
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
  const next = { ...NOTIFICATION_POLICY[type].defaults, ...(existing || {}), [channel]: body.enabled };
  const { data, error } = await admin.from('notification_channel_preferences').upsert({
    user_id:user.id,
    notification_type:type,
    ...next,
    updated_at:new Date().toISOString(),
  },{onConflict:'user_id,notification_type'}).select('notification_type,in_app,push,email,sms').single();
  if (error) return NextResponse.json({ error:'SAVE_FAILED' }, { status:500 });

  await admin.from('notification_preference_audit').insert({user_id:user.id,notification_type:type,channel,enabled:body.enabled});

  return NextResponse.json({ ok:true, preference:data });
}
