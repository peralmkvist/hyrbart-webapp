import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

const REASONS = new Set(['harassment','hate','threats','personal_data','spam','fraud','other']);
const HOURLY_LIMIT = 10;

export async function POST(request: Request, { params }: { params: Promise<{ id:string; messageId:string }> }) {
  const { id, messageId } = await params;
  const supabase = await createClient();
  const { data:{ user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error:'NOT_AUTHENTICATED' }, { status:401 });

  const admin = createAdminClient();
  const { data:booking } = await admin.from('bookings').select('id,renter_id,owner_id').eq('id',id).maybeSingle();
  if (!booking) return NextResponse.json({ error:'BOOKING_NOT_FOUND' }, { status:404 });
  if (booking.renter_id !== user.id && booking.owner_id !== user.id) return NextResponse.json({ error:'NO_ACCESS' }, { status:403 });

  const { data:message } = await admin.from('booking_messages').select('id,booking_id,sender_id,created_at').eq('id',messageId).eq('booking_id',id).maybeSingle();
  if (!message) return NextResponse.json({ error:'MESSAGE_NOT_FOUND' }, { status:404 });
  if (message.sender_id === user.id) return NextResponse.json({ error:'CANNOT_REPORT_OWN_MESSAGE' }, { status:400 });
  const expectedCounterpart = booking.renter_id === user.id ? booking.owner_id : booking.renter_id;
  if (message.sender_id !== expectedCounterpart) return NextResponse.json({ error:'INVALID_MESSAGE_SENDER' }, { status:400 });

  let body:{reason?:string;details?:string};
  try { body = await request.json(); } catch { return NextResponse.json({ error:'INVALID_BODY' }, { status:400 }); }
  const reason = String(body.reason || '');
  const details = String(body.details || '').trim();
  if (!REASONS.has(reason)) return NextResponse.json({ error:'INVALID_REASON' }, { status:400 });
  if (details.length > 1000) return NextResponse.json({ error:'DETAILS_TOO_LONG' }, { status:400 });

  const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { count } = await admin.from('booking_message_reports').select('id',{count:'exact',head:true}).eq('reporter_id',user.id).gte('created_at',since);
  if ((count || 0) >= HOURLY_LIMIT) return NextResponse.json({ error:'RATE_LIMITED' }, { status:429 });

  const { data:existing } = await admin.from('booking_message_reports').select('id').eq('message_id',messageId).eq('reporter_id',user.id).maybeSingle();
  if (existing) return NextResponse.json({ error:'ALREADY_REPORTED' }, { status:409 });

  const { data:report,error } = await admin.from('booking_message_reports').insert({
    message_id:messageId,
    booking_id:id,
    reporter_id:user.id,
    reported_user_id:message.sender_id,
    reason,
    details:details || null,
  }).select('id,status,created_at').single();
  if (error) {
    if (error.code === '23505') return NextResponse.json({ error:'ALREADY_REPORTED' }, { status:409 });
    return NextResponse.json({ error:'REPORT_FAILED' }, { status:500 });
  }
  return NextResponse.json({ ok:true, report }, { status:201, headers:{'cache-control':'private, no-store'} });
}
