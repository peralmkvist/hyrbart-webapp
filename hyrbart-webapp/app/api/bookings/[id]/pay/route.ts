import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getProducts } from '@/lib/sanity-products';
import { sendPushToUser } from '@/lib/push';

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
      .select('id,renter_id,owner_id,product_id,start_date,end_date,status,total_price')
      .eq('id', id)
      .maybeSingle();
    if (bookingError) throw bookingError;
    if (!booking) return NextResponse.json({ error: 'Bokningen hittades inte.' }, { status: 404 });
    if (booking.renter_id !== user.id) return NextResponse.json({ error: 'Endast hyrestagaren kan betala bokningen.' }, { status: 403 });
    if (booking.status !== 'accepted') return NextResponse.json({ error: 'Bokningen är inte redo för betalning.' }, { status: 409 });

    const { data: profile, error: profileError } = await admin.from('profiles').select('payment_method_ready').eq('id', user.id).maybeSingle();
    if (profileError) throw profileError;
    if (!profile?.payment_method_ready) return NextResponse.json({ error: 'Lägg till en betalningsmetod innan du kan betala.', code: 'PAYMENT_METHOD_REQUIRED' }, { status: 409 });

    const { data: updated, error: updateError } = await admin.from('bookings').update({ status: 'paid' }).eq('id', id).eq('status', 'accepted').select('id,status,total_price').single();
    if (updateError) throw updateError;

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

    return NextResponse.json({ ok: true, status: updated.status, total: updated.total_price, simulated: true });
  } catch (error) {
    console.error('Simulated payment failed', error);
    return NextResponse.json({ error: 'Kunde inte genomföra testbetalningen.' }, { status: 500 });
  }
}
