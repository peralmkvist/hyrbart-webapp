import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'UNAUTHENTICATED' }, { status: 401 });
  const [listResult,countResult] = await Promise.all([
    supabase.from('user_notifications')
      .select('id,booking_id,notification_type,title,body,url,read_at,created_at,push_status,email_status')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(100),
    supabase.from('user_notifications')
      .select('id',{count:'exact',head:true})
      .eq('user_id',user.id)
      .is('read_at',null),
  ]);
  if (listResult.error || countResult.error) return NextResponse.json({ error: 'LOAD_FAILED' }, { status: 500 });
  return NextResponse.json({ notifications: listResult.data || [], unread: countResult.count || 0 });
}

export async function PATCH(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'UNAUTHENTICATED' }, { status: 401 });
  const body = await request.json().catch(() => ({}));
  const admin = createAdminClient();
  const now = new Date().toISOString();
  if (body.all === true) {
    const { error } = await admin.from('user_notifications').update({ read_at: now }).eq('user_id', user.id).is('read_at', null);
    if (error) return NextResponse.json({ error: 'SAVE_FAILED' }, { status: 500 });
    return NextResponse.json({ ok: true });
  }
  const id = String(body.id || '');
  if (!id) return NextResponse.json({ error: 'ID_REQUIRED' }, { status: 400 });
  const readAt = body.read === false ? null : now;
  const { data, error } = await admin.from('user_notifications').update({ read_at: readAt }).eq('id', id).eq('user_id', user.id).select('id').maybeSingle();
  if (error) return NextResponse.json({ error: 'SAVE_FAILED' }, { status: 500 });
  if (!data) return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 });
  return NextResponse.json({ ok: true });
}
