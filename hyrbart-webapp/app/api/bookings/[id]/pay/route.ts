import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getProducts } from '@/lib/sanity-products';
import { sendPushToUser } from '@/lib/push';
import { recordBookingEvent } from '@/lib/booking-events';
import { ensureSimulatedCapture } from '@/lib/payment-ledger';
import { canBookingTransition } from '@/lib/booking-state';

function formatDateRange(from: string, to: string) {
  const format = (value: string) => new Intl.DateTimeFormat('sv-SE', { day: 'numeric', month: 'short', timeZone: 'UTC' }).format(new Date(`${value}T12:00:00Z`));
  return `${format(from)} – ${format(to)}`;
}

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const supabase = await createClient();
    const admin = createAdminClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Inte inloggad.' }, { status: 401 });

    const { data: booking, error: bookingError } = await admin
      .from('bookings')
      .select('id,renter_id,owner_id,product_id,start_date,end_date,status,currency,rental_price,service_fee,total_price')
      .eq('id', id)
      .maybeSingle();
    if (bookingError) throw bookingError;
    if (!booking) return NextResponse.json({ error: 'Bokningen hittades inte.' }, { status: 404 });
    if (booking.renter_id !== user.id) return NextResponse.json({ error: 'Endast hyrestagaren kan betala bokningen.' }, { status: 403 });

    const alreadyPaid = booking.status === 'paid';
    if (!alreadyPaid && !canBookingTransition(booking.status, 'paid', 'renter')) {
      return NextResponse.json({ error: 'Bokningen är inte redo för betalning.' }, { status: 409 });
    }

    if (!alreadyPaid) {
      const { data: profile, error: profileError } = await admin
        .from('profiles')
        .select('payment_method_ready')
        .eq('id', user.id)
        .maybeSingle();
      if (profileError) throw profileError;
      if (!profile?.payment_method_ready) {
        return NextResponse.json({ error: 'Lägg till en betalningsmetod innan du kan betala.', code: 'PAYMENT_METHOD_REQUIRED' }, { status: 409 });
      }
    }

    const payment = await ensureSimulatedCapture(booking);

    if (!alreadyPaid) {
      const { data: updated, error: updateError } = await admin
        .from('bookings')
        .update({ status: 'paid', updated_at: new Date().toISOString() })
        .eq('id', id)
        .eq('status', booking.status)
        .select('id,status,total_price')
        .single();
      if (updateError) throw updateError;

      await recordBookingEvent({
        bookingId: id,
        actorId: user.id,
        eventType: 'payment_captured',
        metadata: {
          previous_status: booking.status,
          new_status: updated.status,
          payment_id: payment.id,
          provider: payment.provider,
          amount: payment.amount,
          currency: payment.currency,
          simulated: payment.provider === 'simulation',
        },
      });

      if (booking.owner_id) {
        const products = await getProducts();
        const product = products.find(item => item.id === booking.product_id);
        const productName = product ? [product.brand, product.name].filter(Boolean).join(' ') : 'Produkt';
        await sendPushToUser(booking.owner_id, {
          title: 'Betalning genomförd',
          body: `${productName}\n${formatDateRange(booking.start_date, booking.end_date)}`,
          url: `/topsecret/sv/bokningar/${id}`,
          tag: `booking-payment-${id}`,
        });
      }
    }

    return NextResponse.json({
      ok: true,
      status: 'paid',
      total: Number(booking.total_price || payment.amount || 0),
      paymentId: payment.id,
      provider: payment.provider,
      simulated: payment.provider === 'simulation',
      idempotent: alreadyPaid,
    });
  } catch (error) {
    console.error('Payment failed', error);
    return NextResponse.json({ error: 'Kunde inte genomföra testbetalningen.' }, { status: 500 });
  }
}
