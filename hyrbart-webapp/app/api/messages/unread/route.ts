import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ unread: false, count: 0 }, { status: 401 });

  const { data: bookings, error: bookingError } = await supabase
    .from('bookings')
    .select('id,status,renter_id,owner_id')
    .or(`renter_id.eq.${user.id},owner_id.eq.${user.id}`);
  if (bookingError) return NextResponse.json({ unread: false, count: 0 });

  const ids = (bookings ?? []).map(b => b.id);
  let count = 0;
  if (ids.length) {
    const { count: unreadCount } = await supabase
      .from('booking_messages')
      .select('id', { count: 'exact', head: true })
      .in('booking_id', ids)
      .neq('sender_id', user.id)
      .is('read_at', null);
    count += unreadCount ?? 0;
  }

  const unresolved = (bookings ?? []).some(b => b.owner_id === user.id && ['requested','reserved'].includes(b.status));
  return NextResponse.json({ unread: count > 0 || unresolved, count, unresolved });
}
