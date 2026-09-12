import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getProducts } from '@/lib/sanity-products';

export const runtime = 'nodejs';

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ bookings: [] }, { status: 401 });

    const [{ data: rows, error }, products] = await Promise.all([
      supabase
        .from('bookings')
        .select('id,product_id,start_date,end_date,status,request_type,total_price,created_at,renter_id,owner_id')
        .or(`renter_id.eq.${user.id},owner_id.eq.${user.id}`)
        .order('start_date', { ascending: true }),
      getProducts(),
    ]);
    if (error) throw error;

    const bookings = (rows ?? []).map(row => {
      const product = products.find(item => item.id === row.product_id);
      return {
        id: row.id,
        from: row.start_date,
        to: row.end_date,
        status: row.status,
        requestType: row.request_type,
        total: row.total_price,
        createdAt: row.created_at,
        role: row.owner_id === user.id ? 'owner' : 'renter',
        product: product ? { slug: product.slug, brand: product.brand, name: product.name, image: product.image } : undefined,
      };
    });
    return NextResponse.json({ bookings });
  } catch (error) {
    console.error('Booking request GET failed', error);
    return NextResponse.json({ error: 'Kunde inte hämta bokningar.' }, { status: 500 });
  }
}
