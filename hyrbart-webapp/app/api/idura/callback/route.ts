import { randomUUID, timingSafeEqual } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { applyTrustedProviderResult } from '@/lib/identity-verification';
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

function localeFromRequest(request: NextRequest) {
  return request.cookies.get(IDURA_COOKIE_NAMES.locale)?.value === 'en' ? 'en' : 'sv';
}

function resultUrl(request: NextRequest, result: string) {
  return new URL(`/topsecret/${localeFromRequest(request)}/profil/verifiering?bankid=${encodeURIComponent(result)}`, request.url);
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

async function currentUser() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

async function applyResult(request: NextRequest, status: 'verified'|'failed'|'cancelled', failureCode?: string) {
  const user = await currentUser();
  const attemptId = request.cookies.get(IDURA_COOKIE_NAMES.attempt)?.value;
  if (!user || !attemptId) return false;
  await applyTrustedProviderResult({
    userId: user.id,
    attemptId,
    provider: 'idura-bankid',
    status,
    failureCode: failureCode || null,
    correlationId: randomUUID(),
  });
  return true;
}

export async function GET(request: NextRequest) {
  const providerError = request.nextUrl.searchParams.get('error');
  if (providerError) {
    const cancelled = providerError === 'access_denied';
    try { await applyResult(request, cancelled ? 'cancelled' : 'failed', providerError); }
    catch (error) { console.error('Could not persist Idura authorization error', error); }
    return clearTransactionCookies(NextResponse.redirect(resultUrl(request, cancelled ? 'cancelled' : 'failed')));
  }

  const code = request.nextUrl.searchParams.get('code');
  const returnedState = request.nextUrl.searchParams.get('state');
  const expectedState = request.cookies.get(IDURA_COOKIE_NAMES.state)?.value;
  const expectedNonce = request.cookies.get(IDURA_COOKIE_NAMES.nonce)?.value;
  const codeVerifier = request.cookies.get(IDURA_COOKIE_NAMES.verifier)?.value;
  const attemptId = request.cookies.get(IDURA_COOKIE_NAMES.attempt)?.value;

  if (!code || !returnedState || !expectedState || !expectedNonce || !codeVerifier || !attemptId) {
    return clearTransactionCookies(NextResponse.redirect(resultUrl(request, 'session-error')));
  }
  if (!safeEqual(returnedState, expectedState)) {
    return clearTransactionCookies(NextResponse.redirect(resultUrl(request, 'state-error')));
  }

  try {
    const user = await currentUser();
    if (!user) {
      return clearTransactionCookies(NextResponse.redirect(resultUrl(request, 'session-expired')));
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

    await applyTrustedProviderResult({
      userId: user.id,
      attemptId,
      provider: 'idura-bankid',
      status: 'verified',
      correlationId: randomUUID(),
    });

    return clearTransactionCookies(NextResponse.redirect(resultUrl(request, 'verified')));
  } catch (error) {
    console.error('Idura BankID callback failed', error);
    try { await applyResult(request, 'failed', 'IDURA_CALLBACK_FAILED'); }
    catch (persistError) { console.error('Could not persist Idura callback failure', persistError); }
    return clearTransactionCookies(NextResponse.redirect(resultUrl(request, 'failed')));
  }
}
