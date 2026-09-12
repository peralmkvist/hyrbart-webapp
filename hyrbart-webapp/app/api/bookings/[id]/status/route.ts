import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getProducts } from '@/lib/sanity-products';
import { sendPushToUser } from '@/lib/push';

const statusTitle: Record<string, string> = {
  accepted: 'Bokning godkänd',
  declined: 'Bokningsförfrågan nekad',
  cancelled: 'Bokning avbokad',
  refunded: 'Bokning avbokad',
  completed: 'Bokning avslutad',
};

function formatDateRange(from: string, to: string) {
  const format = (value: string) => new Intl.DateTimeFormat('sv-SE', { day: 'numeric', month: 'short', timeZone: 'UTC' }).format(new Date(`${value}T12:00:00Z`));
  return `${format(from)} – ${format(to)}`;
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let body: { status?: string };
  try { body = await request.json(); } catch { return NextResponse.json({ error: 'Ogiltig förfrågan.' }, { status: 400 }); }
  const requestedStatus = body.status;
  if (!requestedStatus) return NextResponse.json({ error: 'Status saknas.' }, { status: 400 });

  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Inte inloggad.' }, { status: 401 });

    const { data: booking, error: loadError } = await supabase
      .from('bookings')
      .select('id,owner_id,renter_id,product_id,start_date,end_date,status')
      .eq('id', id)
      .maybeSingle();
    if (loadError) throw loadError;
    if (!booking) return NextResponse.json({ error: 'Bokningen hittades inte.' }, { status: 404 });

    const isOwner = booking.owner_id === user.id;
    const isRenter = booking.renter_id === user.id;
    if (!isOwner && !isRenter) return NextResponse.json({ error: 'Du får inte hantera den här bokningen.' }, { status: 403 });

    let nextStatus = requestedStatus;
    let allowed = false;
    if (isOwner && ['requested', 'reserved'].includes(booking.status) && ['accepted', 'declined'].includes(requestedStatus)) allowed = true;
    if (requestedStatus === 'cancelled') {
      if (isRenter && ['requested', 'reserved', 'accepted'].includes(booking.status)) allowed = true;
      if (isOwner && booking.status === 'accepted') allowed = true;
      if ((isRenter || isOwner) && booking.status === 'paid') { allowed = true; nextStatus = 'refunded'; }
    }
    if (isOwner && booking.status === 'returned' && requestedStatus === 'completed') allowed = true;
    if (!allowed) return NextResponse.json({ error: 'Den statusändringen är inte tillåten.' }, { status: 409 });

    const { data: updated, error: updateError } = await supabase.from('bookings').update({ status: nextStatus }).eq('id', id).select('id,status').single();
    if (updateError) throw updateError;

    const recipientId = isOwner ? booking.renter_id : booking.owner_id;
    if (recipientId) {
      const products = await getProducts();
      const product = products.find(item => item.id === booking.product_id);
      const productName = product ? [product.brand, product.name].filter(Boolean).join(' ') : 'Produkt';
      await sendPushToUser(recipientId, {
        title: statusTitle[updated.status] || 'Bokning uppdaterad',
        body: `${productName}\n${formatDateRange(booking.start_date, booking.end_date)}`,
        url: `/topsecret/sv/bokningar/${id}`,
        tag: `booking-status-${id}`,
      });
    }

    return NextResponse.json({ ok: true, status: updated.status, refundSimulated: booking.status === 'paid' && updated.status === 'refunded' });
  } catch (error) {
    console.error('Booking status update failed', error);
    return NextResponse.json({ error: 'Kunde inte uppdatera bokningen.' }, { status: 500 });
  }
}
