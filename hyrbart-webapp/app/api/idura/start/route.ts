import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getIdentityVerificationState } from '@/lib/identity-verification';
import {
  buildAuthorizationUrl,
  createPkceChallenge,
  IDURA_COOKIE_NAMES,
  IDURA_TRANSACTION_TTL_SECONDS,
  randomUrlSafe,
} from '@/lib/idura';

export const runtime = 'nodejs';

function callbackUrl(request: NextRequest) {
  return new URL('/api/idura/callback', request.nextUrl.origin).toString();
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) {
      return NextResponse.redirect(new URL('/topsecret/sv/logga-in', request.url));
    }

    const attemptId = request.nextUrl.searchParams.get('attemptId');
    const locale = request.nextUrl.searchParams.get('locale') === 'en' ? 'en' : 'sv';
    if (!attemptId) {
      return NextResponse.redirect(new URL(`/topsecret/${locale}/profil/verifiering?bankid=missing-attempt`, request.url));
    }

    const verification = await getIdentityVerificationState(user.id);
    if (
      verification.configuredProvider !== 'idura-bankid' ||
      verification.latestAttempt?.id !== attemptId ||
      verification.latestAttempt?.provider !== 'idura-bankid' ||
      verification.latestAttempt?.status !== 'pending'
    ) {
      return NextResponse.redirect(new URL(`/topsecret/${locale}/profil/verifiering?bankid=invalid-attempt`, request.url));
    }

    const state = randomUrlSafe();
    const nonce = randomUrlSafe();
    const verifier = randomUrlSafe(48);
    const codeChallenge = createPkceChallenge(verifier);
    const redirectUri = callbackUrl(request);
    const authorizationUrl = await buildAuthorizationUrl({ redirectUri, state, nonce, codeChallenge });

    const response = NextResponse.redirect(authorizationUrl);
    const cookieOptions = {
      httpOnly: true,
      secure: true,
      sameSite: 'lax' as const,
      path: '/api/idura/callback',
      maxAge: IDURA_TRANSACTION_TTL_SECONDS,
    };
    response.cookies.set(IDURA_COOKIE_NAMES.state, state, cookieOptions);
    response.cookies.set(IDURA_COOKIE_NAMES.nonce, nonce, cookieOptions);
    response.cookies.set(IDURA_COOKIE_NAMES.verifier, verifier, cookieOptions);
    response.cookies.set(IDURA_COOKIE_NAMES.attempt, attemptId, cookieOptions);
    response.cookies.set(IDURA_COOKIE_NAMES.locale, locale, cookieOptions);
    return response;
  } catch (error) {
    console.error('Idura BankID start failed', error);
    return NextResponse.json({ error: 'Det gick inte att starta BankID-verifieringen.' }, { status: 500, headers: { 'Cache-Control': 'no-store' } });
  }
}
