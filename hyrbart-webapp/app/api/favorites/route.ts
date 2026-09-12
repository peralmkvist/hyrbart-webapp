import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

async function getCurrentUser() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return { supabase, user: null };
  return { supabase, user: data.user };
}

export async function GET() {
  try {
    const { supabase, user } = await getCurrentUser();
    if (!user) return NextResponse.json({ favorites: [], authenticated: false }, { status: 401 });

    const { data, error } = await supabase
      .from('favorites')
      .select('product_slug')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true });

    if (error) throw error;
    return NextResponse.json({ favorites: (data ?? []).map(item => item.product_slug), authenticated: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Could not load favorites' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { supabase, user } = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

    const body = await request.json() as { slug?: string; favorite?: boolean; migrate?: string[] };

    if (Array.isArray(body.migrate)) {
      const slugs = Array.from(new Set(body.migrate.map(slug => String(slug).trim()).filter(Boolean))).slice(0, 200);
      if (slugs.length) {
        const { error } = await supabase.from('favorites').upsert(
          slugs.map(product_slug => ({ user_id: user.id, product_slug })),
          { onConflict: 'user_id,product_slug', ignoreDuplicates: true }
        );
        if (error) throw error;
      }
    } else {
      const slug = String(body.slug ?? '').trim();
      if (!slug) return NextResponse.json({ error: 'Missing slug' }, { status: 400 });

      if (body.favorite) {
        const { error } = await supabase.from('favorites').upsert(
          { user_id: user.id, product_slug: slug },
          { onConflict: 'user_id,product_slug', ignoreDuplicates: true }
        );
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('favorites')
          .delete()
          .eq('user_id', user.id)
          .eq('product_slug', slug);
        if (error) throw error;
      }
    }

    const { data, error } = await supabase
      .from('favorites')
      .select('product_slug')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true });
    if (error) throw error;

    return NextResponse.json({ favorites: (data ?? []).map(item => item.product_slug), authenticated: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Could not update favorite' }, { status: 500 });
  }
}
