import { timingSafeEqual } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  exchangeAuthorizationCode,
  IDURA_BANKID_ACR,
  IDURA_COOKIE_NAMES,
  verifyIdToken,
} from '@/lib/idura';

export const runtime = 'nodejs';

function callbackUrl(request: NextRequest) {
  return new URL('/api/idura/callback', request.nextUrl.origin).toString();
}

function safeEqual(a: string, b: string) {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

function clearTransactionCookies(response: NextResponse) {
  for (const name of Object.values(IDURA_COOKIE_NAMES)) {
    response.cookies.set(name, '', {
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      path: '/api/idura/callback',
      maxAge: 0,
    });
  }
  return response;
}

function jsonError(message: string, status: number) {
  const response = NextResponse.json({ error: message }, {
    status,
    headers: { 'Cache-Control': 'no-store' },
  });
  return clearTransactionCookies(response);
}

export async function GET(request: NextRequest) {
  const providerError = request.nextUrl.searchParams.get('error');
  if (providerError) {
    const description = request.nextUrl.searchParams.get('error_description');
    console.warn('Idura returned an authorization error', { providerError, description });
    return jsonError('BankID-verifieringen avbröts eller kunde inte slutföras.', 400);
  }

  const code = request.nextUrl.searchParams.get('code');
  const returnedState = request.nextUrl.searchParams.get('state');
  const expectedState = request.cookies.get(IDURA_COOKIE_NAMES.state)?.value;
  const expectedNonce = request.cookies.get(IDURA_COOKIE_NAMES.nonce)?.value;
  const codeVerifier = request.cookies.get(IDURA_COOKIE_NAMES.verifier)?.value;

  if (!code || !returnedState || !expectedState || !expectedNonce || !codeVerifier) {
    return jsonError('BankID-verifieringen saknar nödvändig sessionsinformation. Starta om verifieringen.', 400);
  }
  if (!safeEqual(returnedState, expectedState)) {
    return jsonError('BankID-verifieringen kunde inte valideras. Starta om verifieringen.', 400);
  }

  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return jsonError('Din Hyrbart-session har gått ut. Logga in igen och starta om verifieringen.', 401);
    }

    const { token, discovery } = await exchangeAuthorizationCode({
      code,
      redirectUri: callbackUrl(request),
      codeVerifier,
    });
    const claims = await verifyIdToken({
      idToken: token.id_token!,
      discovery,
      expectedNonce,
    });

    if (typeof claims.acr !== 'string' || !claims.acr.startsWith(IDURA_BANKID_ACR)) {
      throw new Error('The completed Idura authentication was not Swedish BankID.');
    }

    // Intentionally do not persist personal data yet. The next implementation step
    // stores only the minimum verification record needed by Hyrbart after the data
    // model and retention policy have been reviewed.
    const response = NextResponse.json({
      ok: true,
      verification: {
        provider: 'SE BankID',
        subject: claims.sub,
        verifiedAt: new Date().toISOString(),
      },
    }, {
      headers: { 'Cache-Control': 'no-store' },
    });
    return clearTransactionCookies(response);
  } catch (error) {
    console.error('Idura BankID callback failed', error);
    return jsonError('BankID-verifieringen kunde inte valideras.', 400);
  }
}
