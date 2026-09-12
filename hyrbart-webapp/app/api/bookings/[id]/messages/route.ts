import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { sendPushToUser } from '@/lib/push';

const BUCKET = 'booking-attachments';
const MAX_FILE_SIZE = 8 * 1024 * 1024;
const ALLOWED_TYPES = new Set(['image/jpeg','image/png','image/webp','image/heic','application/pdf']);

async function getParticipantBooking(supabase: Awaited<ReturnType<typeof createClient>>, id: string, userId: string) {
  const { data: booking } = await supabase.from('bookings').select('id,renter_id,owner_id').eq('id', id).maybeSingle();
  if (!booking || (booking.renter_id !== userId && booking.owner_id !== userId)) return null;
  return booking;
}

async function enrichMessages(rows: any[]) {
  const admin = createAdminClient();
  return Promise.all((rows ?? []).map(async message => {
    if (!message.attachment_path) return { ...message, attachment_url: null };
    const { data } = await admin.storage.from(BUCKET).createSignedUrl(message.attachment_path, 3600);
    return { ...message, attachment_url: data?.signedUrl ?? null };
  }));
}

async function notifyCounterpart(booking: { renter_id: string; owner_id: string }, senderId: string, bookingId: string, body: string) {
  const recipientId = booking.renter_id === senderId ? booking.owner_id : booking.renter_id;
  if (!recipientId) return;
  await sendPushToUser(recipientId, {
    title: 'Nytt meddelande på Hyrbart',
    body: body.length > 120 ? `${body.slice(0, 117)}…` : body,
    url: `/topsecret/sv/bokningar/${bookingId}`,
    tag: `booking-message-${bookingId}`,
  });
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Inte inloggad.' }, { status: 401 });
  if (!await getParticipantBooking(supabase, id, user.id)) return NextResponse.json({ error: 'Bokningen hittades inte.' }, { status: 404 });

  const { data: messages, error } = await supabase
    .from('booking_messages')
    .select('id,sender_id,body,created_at,read_at,attachment_path,attachment_name,attachment_type,attachment_size')
    .eq('booking_id', id)
    .order('created_at', { ascending: true });
  if (error) return NextResponse.json({ error: 'Kunde inte hämta meddelanden.' }, { status: 500 });

  const unreadIds = (messages ?? []).filter(m => m.sender_id !== user.id && !m.read_at).map(m => m.id);
  if (unreadIds.length) await supabase.from('booking_messages').update({ read_at: new Date().toISOString() }).in('id', unreadIds);

  return NextResponse.json({ messages: await enrichMessages(messages ?? []), currentUserId: user.id });
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Inte inloggad.' }, { status: 401 });
  const booking = await getParticipantBooking(supabase, id, user.id);
  if (!booking) return NextResponse.json({ error: 'Bokningen hittades inte.' }, { status: 404 });

  const contentType = request.headers.get('content-type') || '';
  if (contentType.includes('multipart/form-data')) {
    const form = await request.formData();
    const file = form.get('file');
    const text = String(form.get('body') || '').trim().slice(0, 2000);
    if (!(file instanceof File) || file.size === 0) return NextResponse.json({ error: 'Ingen fil vald.' }, { status: 400 });
    if (file.size > MAX_FILE_SIZE) return NextResponse.json({ error: 'Filen får vara högst 8 MB.' }, { status: 400 });
    if (!ALLOWED_TYPES.has(file.type)) return NextResponse.json({ error: 'Tillåtna format är JPG, PNG, WebP, HEIC och PDF.' }, { status: 400 });

    const admin = createAdminClient();
    const rawExt = file.name.split('.').pop()?.toLowerCase().replace(/[^a-z0-9]/g,'') || '';
    const fallbackExt = file.type === 'application/pdf' ? 'pdf' : file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : file.type === 'image/heic' ? 'heic' : 'jpg';
    const path = `${id}/${crypto.randomUUID()}.${rawExt || fallbackExt}`;
    const bytes = new Uint8Array(await file.arrayBuffer());
    const { error: uploadError } = await admin.storage.from(BUCKET).upload(path, bytes, { contentType: file.type, upsert: false });
    if (uploadError) return NextResponse.json({ error: 'Kunde inte ladda upp bilagan.' }, { status: 500 });

    const { data: message, error } = await admin.from('booking_messages').insert({
      booking_id: id, sender_id: user.id, body: text, attachment_path: path,
      attachment_name: file.name.slice(0, 180), attachment_type: file.type, attachment_size: file.size,
    }).select('id,sender_id,body,created_at,read_at,attachment_path,attachment_name,attachment_type,attachment_size').single();
    if (error) {
      await admin.storage.from(BUCKET).remove([path]);
      return NextResponse.json({ error: 'Kunde inte skicka bilagan.' }, { status: 500 });
    }
    await notifyCounterpart(booking, user.id, id, text || `Bilaga: ${file.name}`);
    const [enriched] = await enrichMessages([message]);
    return NextResponse.json({ ok: true, message: enriched });
  }

  let body: { body?: string };
  try { body = await request.json(); } catch { return NextResponse.json({ error: 'Ogiltigt meddelande.' }, { status: 400 }); }
  const text = body.body?.trim() ?? '';
  if (!text || text.length > 2000) return NextResponse.json({ error: 'Meddelandet måste vara 1–2000 tecken.' }, { status: 400 });

  const { data: message, error } = await supabase.from('booking_messages')
    .insert({ booking_id: id, sender_id: user.id, body: text })
    .select('id,sender_id,body,created_at,read_at,attachment_path,attachment_name,attachment_type,attachment_size').single();
  if (error) return NextResponse.json({ error: 'Kunde inte skicka meddelandet.' }, { status: 500 });
  await notifyCounterpart(booking, user.id, id, text);
  return NextResponse.json({ ok: true, message: { ...message, attachment_url: null } });
}
