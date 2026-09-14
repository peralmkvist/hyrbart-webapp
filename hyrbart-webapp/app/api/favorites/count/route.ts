import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

const MAX_BATCH_SLUGS = 100;

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const slug = String(searchParams.get('slug') ?? '').trim();
    const batchSlugs = String(searchParams.get('slugs') ?? '')
      .split(',')
      .map(value => value.trim())
      .filter(Boolean);

    const slugs = Array.from(new Set(slug ? [slug] : batchSlugs)).slice(0, MAX_BATCH_SLUGS);
    if (!slugs.length) return NextResponse.json({ error: 'Missing slug' }, { status: 400 });

    const supabase = createAdminClient();

    if (slugs.length === 1) {
      const singleSlug = slugs[0];
      const { count, error } = await supabase
        .from('favorites')
        .select('*', { count: 'exact', head: true })
        .eq('product_slug', singleSlug);

      if (error) throw error;
      return NextResponse.json({ slug: singleSlug, count: count ?? 0 }, { headers: { 'cache-control': 'no-store' } });
    }

    const { data, error } = await supabase
      .from('favorites')
      .select('product_slug')
      .in('product_slug', slugs);

    if (error) throw error;

    const counts = Object.fromEntries(slugs.map(value => [value, 0])) as Record<string, number>;
    for (const row of data ?? []) {
      const productSlug = String(row.product_slug ?? '');
      if (productSlug in counts) counts[productSlug] += 1;
    }

    return NextResponse.json({ counts }, { headers: { 'cache-control': 'no-store' } });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Could not count favorites' }, { status: 500 });
  }
}
