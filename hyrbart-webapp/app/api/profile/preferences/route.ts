import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

const COOKIE_NAME = 'hyrbart_locale';

function language(value: unknown): 'sv' | 'en' | null {
  return value === 'sv' || value === 'en' ? value : null;
}

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ preferredLanguage: 'sv' });

  const { data, error } = await supabase
    .from('profiles')
    .select('preferred_language')
    .eq('id', user.id)
    .maybeSingle();

  if (error) return NextResponse.json({ preferredLanguage: 'sv' });
  return NextResponse.json({ preferredLanguage: language(data?.preferred_language) || 'sv' });
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({})) as { preferredLanguage?: string };
  const preferredLanguage = language(body.preferredLanguage);
  if (!preferredLanguage) return NextResponse.json({ error: 'Invalid language' }, { status: 400 });

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (user) {
    const { error } = await supabase
      .from('profiles')
      .update({ preferred_language: preferredLanguage, updated_at: new Date().toISOString() })
      .eq('id', user.id);
    if (error) return NextResponse.json({ error: 'Could not save preference' }, { status: 500 });
  }

  const response = NextResponse.json({ preferredLanguage });
  response.cookies.set(COOKIE_NAME, preferredLanguage, {
    path: '/',
    maxAge: 60 * 60 * 24 * 365,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
  });
  return response;
}
