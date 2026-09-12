import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getProduct } from '@/lib/sanity-products';
import { calculateRentalPricing } from '@/lib/rental-pricing';

export const runtime = 'nodejs';

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Inte inloggad.' }, { status: 401 });

    const { data, error } = await supabase
      .from('bookings')
      .select('id,product_id,start_date,end_date,request_type,message,status,rental_price,service_fee,total_price,created_at,renter_id,owner_id')
      .or(`renter_id.eq.${user.id},owner_id.eq.${user.id}`)
      .order('created_at', { ascending: false })
      .limit(50);
    if (error) throw error;
    return NextResponse.json({ requests: data ?? [] });
  } catch (error) {
    console.error('Booking request GET failed', error);
    return NextResponse.json({ error: 'Kunde inte läsa bokningsförfrågningar.' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  let body: { slug?: string; from?: string; to?: string; requestType?: 'booking'|'reserve-question'; message?: string };
  try { body = await request.json(); } catch { return NextResponse.json({ error: 'Ogiltig förfrågan.' }, { status: 400 }); }

  const { slug, from, to, requestType = 'booking', message = '' } = body;
  const datePattern = /^\d{4}-\d{2}-\d{2}$/;
  if (!slug || !from || !to || !datePattern.test(from) || !datePattern.test(to) || from > to || !['booking','reserve-question'].includes(requestType)) {
    return NextResponse.json({ error: 'Ogiltiga bokningsuppgifter.' }, { status: 400 });
  }
  if (requestType === 'reserve-question' && !message.trim()) {
    return NextResponse.json({ error: 'Skriv din fråga innan du reserverar.' }, { status: 400 });
  }

  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Logga in för att skicka en bokningsförfrågan.' }, { status: 401 });

    const product = await getProduct(slug);
    if (!product?.id) return NextResponse.json({ error: 'Annonsen hittades inte.' }, { status: 404 });
    if (!product.owner?.id) return NextResponse.json({ error: 'Annonsen saknar en kopplad uthyrare.' }, { status: 409 });

    const { data: owner, error: ownerError } = await supabase
      .from('profiles')
      .select('id')
      .eq('sanity_profile_id', product.owner.id)
      .maybeSingle();
    if (ownerError) throw ownerError;
    if (!owner?.id) return NextResponse.json({ error: 'Uthyraren har ännu inget Hyrbart-konto.' }, { status: 409 });
    if (owner.id === user.id) return NextResponse.json({ error: 'Du kan inte boka din egen annons.' }, { status: 400 });

    const pricing = calculateRentalPricing(product.price, from, to, product.rentalPrices, product.discounts);
    if (!pricing) return NextResponse.json({ error: 'Kunde inte beräkna priset för bokningen.' }, { status: 409 });

    const { data: overlapping, error: overlapError } = await supabase
      .from('bookings')
      .select('id,status')
      .eq('product_id', product.id)
      .lte('start_date', to)
      .gte('end_date', from)
      .in('status', ['requested','reserved','accepted','paid','active','returned']);
    if (overlapError) throw overlapError;
    if ((overlapping ?? []).length > 0) return NextResponse.json({ error: 'Datumen är inte längre tillgängliga.' }, { status: 409 });

    const status = requestType === 'reserve-question' ? 'reserved' : 'requested';
    const { data: booking, error: insertError } = await supabase
      .from('bookings')
      .insert({
        renter_id: user.id,
        owner_id: owner.id,
        product_id: product.id,
        start_date: from,
        end_date: to,
        status,
        request_type: requestType,
        message: message.trim().slice(0, 2000) || null,
        rental_price: pricing.rentalCost,
        service_fee: pricing.bookingFee,
      })
      .select('id,status,total_price')
      .single();
    if (insertError) throw insertError;

    return NextResponse.json({ ok: true, bookingId: booking.id, status: booking.status, total: booking.total_price, reserved: requestType === 'reserve-question' });
  } catch (error) {
    console.error('Booking request failed', error);
    return NextResponse.json({ error: 'Kunde inte skicka förfrågan.' }, { status: 500 });
  }
}
