import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';

export async function GET(request: NextRequest, { params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const url = request.nextUrl.clone();
  const code = url.searchParams.get('code');
  const origin = url.origin;

  const successUrl = `${origin}/topsecret/${locale}/profil`;
  const errorUrl = `${origin}/topsecret/${locale}/logga-in?error=auth`;

  if (!code) return NextResponse.redirect(errorUrl);

  // The auth code exchange writes the session cookies. They must be written to
  // the same response that is returned to the browser; otherwise the redirect
  // succeeds but the user arrives without a persisted session.
  let response = NextResponse.redirect(successUrl);
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!supabaseUrl || !supabaseKey) return NextResponse.redirect(errorUrl);

  const supabase = createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) return NextResponse.redirect(errorUrl);

  const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  if (aal?.currentLevel === 'aal1' && aal?.nextLevel === 'aal2') {
    const mfaResponse = NextResponse.redirect(`${origin}/topsecret/${locale}/mfa`);
    response.cookies.getAll().forEach(cookie => mfaResponse.cookies.set(cookie));
    response = mfaResponse;
  }

  return response;
}
