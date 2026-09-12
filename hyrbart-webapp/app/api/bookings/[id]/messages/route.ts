import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Inte inloggad.' }, { status: 401 });

  const { data: booking } = await supabase.from('bookings').select('id,renter_id,owner_id').eq('id', id).maybeSingle();
  if (!booking || (booking.renter_id !== user.id && booking.owner_id !== user.id)) {
    return NextResponse.json({ error: 'Bokningen hittades inte.' }, { status: 404 });
  }

  const { data: messages, error } = await supabase
    .from('booking_messages')
    .select('id,sender_id,body,created_at,read_at')
    .eq('booking_id', id)
    .order('created_at', { ascending: true });
  if (error) return NextResponse.json({ error: 'Kunde inte hämta meddelanden.' }, { status: 500 });

  const unreadIds = (messages ?? []).filter(m => m.sender_id !== user.id && !m.read_at).map(m => m.id);
  if (unreadIds.length) {
    await supabase.from('booking_messages').update({ read_at: new Date().toISOString() }).in('id', unreadIds);
  }

  return NextResponse.json({ messages: messages ?? [], currentUserId: user.id });
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let body: { body?: string };
  try { body = await request.json(); } catch { return NextResponse.json({ error: 'Ogiltigt meddelande.' }, { status: 400 }); }
  const text = body.body?.trim() ?? '';
  if (!text || text.length > 2000) return NextResponse.json({ error: 'Meddelandet måste vara 1–2000 tecken.' }, { status: 400 });

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Inte inloggad.' }, { status: 401 });

  const { data: booking } = await supabase.from('bookings').select('id,renter_id,owner_id').eq('id', id).maybeSingle();
  if (!booking || (booking.renter_id !== user.id && booking.owner_id !== user.id)) {
    return NextResponse.json({ error: 'Bokningen hittades inte.' }, { status: 404 });
  }

  const { data: message, error } = await supabase
    .from('booking_messages')
    .insert({ booking_id: id, sender_id: user.id, body: text })
    .select('id,sender_id,body,created_at,read_at')
    .single();
  if (error) return NextResponse.json({ error: 'Kunde inte skicka meddelandet.' }, { status: 500 });

  return NextResponse.json({ ok: true, message });
}
