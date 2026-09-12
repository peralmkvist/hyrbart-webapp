import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getProducts } from '@/lib/sanity-products';
import { sendPushToUser } from '@/lib/push';
import { recordBookingEvent } from '@/lib/booking-events';
import { ensureScheduledPayout } from '@/lib/payment-ledger';

const statusTitle: Record<string, string> = {
  accepted: 'Bokning godkänd',
  declined: 'Bokningsförfrågan nekad',
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
  if (requestedStatus === 'cancelled' || requestedStatus === 'refunded') {
    return NextResponse.json({ error: 'Avbokningar måste gå genom avbokningsflödet.', code: 'USE_CANCELLATION_FLOW' }, { status: 409 });
  }

  try {
    const supabase = await createClient();
    const admin = createAdminClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Inte inloggad.' }, { status: 401 });

    const { data: booking, error: loadError } = await admin
      .from('bookings')
      .select('id,owner_id,renter_id,product_id,start_date,end_date,status,currency,rental_price,service_fee,total_price')
      .eq('id', id)
      .maybeSingle();
    if (loadError) throw loadError;
    if (!booking) return NextResponse.json({ error: 'Bokningen hittades inte.' }, { status: 404 });

    const isOwner = booking.owner_id === user.id;
    const isRenter = booking.renter_id === user.id;
    if (!isOwner && !isRenter) return NextResponse.json({ error: 'Du får inte hantera den här bokningen.' }, { status: 403 });

    let allowed = false;
    if (isOwner && ['requested', 'reserved'].includes(booking.status) && ['accepted', 'declined'].includes(requestedStatus)) allowed = true;
    if (isOwner && booking.status === 'returned' && requestedStatus === 'completed') allowed = true;
    if (!allowed) return NextResponse.json({ error: 'Den statusändringen är inte tillåten.' }, { status: 409 });

    const previousStatus = booking.status;
    const now = new Date().toISOString();
    const { data: updated, error: updateError } = await admin
      .from('bookings')
      .update({ status: requestedStatus, updated_at: now })
      .eq('id', id)
      .eq('status', previousStatus)
      .select('id,status')
      .single();
    if (updateError) throw updateError;

    await recordBookingEvent({
      bookingId: id,
      actorId: user.id,
      eventType: 'booking_status_changed',
      metadata: { previous_status: previousStatus, new_status: updated.status, actor_role: isOwner ? 'owner' : 'renter' },
    });

    if (updated.status === 'completed') {
      const payout = await ensureScheduledPayout(booking);
      await recordBookingEvent({
        bookingId: id,
        actorId: user.id,
        eventType: 'payout_scheduled',
        metadata: { payout_id: payout.id, amount: payout.amount, currency: payout.currency, provider: payout.provider, simulated: payout.provider === 'simulation' },
      });
    }

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

    return NextResponse.json({ ok: true, status: updated.status });
  } catch (error) {
    console.error('Booking status update failed', error);
    return NextResponse.json({ error: 'Kunde inte uppdatera bokningen.' }, { status: 500 });
  }
}
