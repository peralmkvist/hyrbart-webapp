import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const slug = String(searchParams.get('slug') ?? '').trim();
    if (!slug) return NextResponse.json({ error: 'Missing slug' }, { status: 400 });

    const supabase = createAdminClient();
    const { count, error } = await supabase
      .from('favorites')
      .select('*', { count: 'exact', head: true })
      .eq('product_slug', slug);

    if (error) throw error;
    return NextResponse.json({ slug, count: count ?? 0 }, { headers: { 'cache-control': 'no-store' } });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Could not count favorites' }, { status: 500 });
  }
}
