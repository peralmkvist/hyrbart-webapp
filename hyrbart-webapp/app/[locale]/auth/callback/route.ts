import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: Request, { params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const origin = url.origin;

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
      if (aal?.currentLevel === 'aal1' && aal?.nextLevel === 'aal2') {
        return NextResponse.redirect(`${origin}/topsecret/${locale}/mfa`);
      }
      return NextResponse.redirect(`${origin}/topsecret/${locale}/profil`);
    }
  }

  return NextResponse.redirect(`${origin}/topsecret/${locale}/logga-in?error=auth`);
}
