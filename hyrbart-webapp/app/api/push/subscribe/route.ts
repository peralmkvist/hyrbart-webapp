import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Inte inloggad.' }, { status: 401 });

  let body: { endpoint?: string; keys?: { p256dh?: string; auth?: string } };
  try { body = await request.json(); } catch { return NextResponse.json({ error: 'Ogiltig prenumeration.' }, { status: 400 }); }
  const endpoint = body.endpoint?.trim();
  const p256dh = body.keys?.p256dh?.trim();
  const auth = body.keys?.auth?.trim();
  if (!endpoint || !p256dh || !auth) return NextResponse.json({ error: 'Ogiltig prenumeration.' }, { status: 400 });

  const { error } = await supabase.from('push_subscriptions').upsert({
    user_id: user.id,
    endpoint,
    p256dh,
    auth,
    user_agent: request.headers.get('user-agent'),
    updated_at: new Date().toISOString(),
  }, { onConflict: 'endpoint' });
  if (error) return NextResponse.json({ error: 'Kunde inte aktivera notiser.' }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Inte inloggad.' }, { status: 401 });

  let body: { endpoint?: string } = {};
  try { body = await request.json(); } catch {}
  if (!body.endpoint) return NextResponse.json({ error: 'Endpoint saknas.' }, { status: 400 });
  const { error } = await supabase.from('push_subscriptions').delete().eq('user_id', user.id).eq('endpoint', body.endpoint);
  if (error) return NextResponse.json({ error: 'Kunde inte stänga av notiser.' }, { status: 500 });
  return NextResponse.json({ ok: true });
}
