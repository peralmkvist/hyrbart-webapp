import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getProduct, getProducts } from '@/lib/sanity-products';
import { calculateRentalPricing } from '@/lib/rental-pricing';

export const runtime = 'nodejs';

export async function GET() {
  try {
    const supabase = await createClient();
    const admin = createAdminClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Inte inloggad.' }, { status: 401 });

    const [{ data, error }, products] = await Promise.all([
      supabase
        .from('bookings')
        .select('id,product_id,start_date,end_date,request_type,message,status,rental_price,service_fee,total_price,created_at,renter_id,owner_id')
        .or(`renter_id.eq.${user.id},owner_id.eq.${user.id}`)
        .order('created_at', { ascending: false })
        .limit(50),
      getProducts(),
    ]);
    if (error) throw error;

    const rows = data ?? [];
    const counterpartIds = Array.from(new Set(rows.map(row => row.owner_id === user.id ? row.renter_id : row.owner_id).filter(Boolean)));
    const profilesById = new Map<string, { display_name?: string | null }>();
    if (counterpartIds.length) {
      const { data: profiles, error: profilesError } = await admin.from('profiles').select('id,display_name').in('id', counterpartIds);
      if (profilesError) throw profilesError;
      for (const profile of profiles ?? []) profilesById.set(profile.id, profile);
    }

    const bookingIds = rows.map(row => row.id);
    const latestByBooking = new Map<string, { body: string; created_at: string; sender_id: string; read_at?: string | null }>();
    const unreadByBooking = new Set<string>();
    if (bookingIds.length) {
      const { data: messages, error: messagesError } = await admin
        .from('booking_messages')
        .select('booking_id,body,created_at,sender_id,read_at')
        .in('booking_id', bookingIds)
        .order('created_at', { ascending: false });
      if (messagesError) throw messagesError;
      for (const message of messages ?? []) {
        if (!latestByBooking.has(message.booking_id)) latestByBooking.set(message.booking_id, message);
        if (message.sender_id !== user.id && !message.read_at) unreadByBooking.add(message.booking_id);
      }
    }

    const requests = rows.map(row => {
      const product = products.find(item => item.id === row.product_id);
      const role = row.owner_id === user.id ? 'owner' : 'renter';
      const counterpartId = role === 'owner' ? row.renter_id : row.owner_id;
      const counterpart = counterpartId ? profilesById.get(counterpartId) : undefined;
      const latest = latestByBooking.get(row.id);
      return {
        id: row.id,
        from: row.start_date,
        to: row.end_date,
        requestType: row.request_type,
        message: row.message,
        status: row.status,
        createdAt: row.created_at,
        role,
        product: product ? [product.brand, product.name].filter(Boolean).join(' ') : 'Produkt',
        participantName: counterpart?.display_name || (role === 'owner' ? 'Hyrare' : 'Uthyrare'),
        latestMessage: latest?.body || null,
        latestMessageAt: latest?.created_at || null,
        unreadMessage: unreadByBooking.has(row.id),
      };
    }).sort((a,b) => new Date(b.latestMessageAt || b.createdAt).getTime() - new Date(a.latestMessageAt || a.createdAt).getTime());

    return NextResponse.json({ requests });
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
    const admin = createAdminClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Logga in för att skicka en bokningsförfrågan.' }, { status: 401 });

    const { data: renterProfile, error: renterProfileError } = await admin
      .from('profiles')
      .select('payment_method_ready')
      .eq('id', user.id)
      .maybeSingle();
    if (renterProfileError) throw renterProfileError;
    if (!renterProfile?.payment_method_ready) {
      return NextResponse.json({
        error: 'Lägg till en betalningsmetod innan du kan boka.',
        code: 'PAYMENT_METHOD_REQUIRED',
      }, { status: 409 });
    }

    const product = await getProduct(slug);
    if (!product?.id) return NextResponse.json({ error: 'Annonsen hittades inte.' }, { status: 404 });
    if (!product.owner?.id) return NextResponse.json({ error: 'Annonsen saknar en kopplad uthyrare.' }, { status: 409 });

    const { data: owner, error: ownerError } = await admin
      .from('profiles')
      .select('id')
      .eq('sanity_profile_id', product.owner.id)
      .maybeSingle();
    if (ownerError) throw ownerError;
    if (!owner?.id) return NextResponse.json({ error: 'Uthyraren har ännu inget Hyrbart-konto.' }, { status: 409 });
    if (owner.id === user.id) return NextResponse.json({ error: 'Du kan inte boka din egen annons.' }, { status: 400 });

    const pricing = calculateRentalPricing(product.price, from, to, product.rentalPrices, product.discounts);
    if (!pricing) return NextResponse.json({ error: 'Kunde inte beräkna priset för bokningen.' }, { status: 409 });

    const { data: overlapping, error: overlapError } = await admin
      .from('bookings')
      .select('id,status')
      .eq('product_id', product.id)
      .lte('start_date', to)
      .gte('end_date', from)
      .in('status', ['requested','reserved','accepted','paid','active','returned']);
    if (overlapError) throw overlapError;
    if ((overlapping ?? []).length > 0) return NextResponse.json({ error: 'Datumen är inte längre tillgängliga.' }, { status: 409 });

    const status = requestType === 'reserve-question' ? 'reserved' : 'requested';
    const { data: booking, error: insertError } = await admin
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

    if (message.trim()) {
      await admin.from('booking_messages').insert({ booking_id: booking.id, sender_id: user.id, body: message.trim().slice(0, 2000) });
    }

    return NextResponse.json({ ok: true, bookingId: booking.id, status: booking.status, total: booking.total_price, reserved: requestType === 'reserve-question' });
  } catch (error) {
    console.error('Booking request failed', error);
    return NextResponse.json({ error: 'Kunde inte skicka förfrågan.' }, { status: 500 });
  }
}
