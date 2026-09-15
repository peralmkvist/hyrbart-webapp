import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
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
      return NextResponse.json({ error: 'Du måste vara inloggad för att verifiera din identitet.' }, { status: 401 });
    }

    const state = randomUrlSafe();
    const nonce = randomUrlSafe();
    const verifier = randomUrlSafe(48);
    const codeChallenge = createPkceChallenge(verifier);
    const redirectUri = callbackUrl(request);

    const authorizationUrl = await buildAuthorizationUrl({
      redirectUri,
      state,
      nonce,
      codeChallenge,
    });

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
    return response;
  } catch (error) {
    console.error('Idura BankID start failed', error);
    return NextResponse.json({ error: 'Det gick inte att starta BankID-verifieringen.' }, { status: 500 });
  }
}
