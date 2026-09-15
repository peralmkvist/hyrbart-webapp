import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const PRIVATE_PREFIX = '/topsecret';
const LOCALE_COOKIE = 'hyrbart_locale';

function appPath(pathname:string){return pathname.startsWith(`${PRIVATE_PREFIX}/`)?pathname.slice(PRIVATE_PREFIX.length):pathname}
function localeFor(pathname:string,saved:'sv'|'en'){const path=appPath(pathname);return path==='/en'||path.startsWith('/en/')?'en':path==='/sv'||path.startsWith('/sv/')?'sv':saved}
function isPublicAuthPath(pathname:string){const path=appPath(pathname);return /^\/(sv|en)\/(logga-in|mfa|admin-inloggning|admin-installning|admin-mfa)(\/|$)/.test(path)||/^\/(sv|en)\/auth(\/|$)/.test(path)||path.startsWith('/auth/')}
function isStudioPath(pathname:string){return pathname==='/studio'||pathname.startsWith('/studio/')}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const requestId = request.headers.get('x-request-id') || crypto.randomUUID();
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-request-id', requestId);
  let response: NextResponse;

  const bypassPrivateShim = process.env.E2E_BYPASS_PRIVATE_PREFIX === '1';
  const savedLocale = request.cookies.get(LOCALE_COOKIE)?.value === 'en' ? 'en' : 'sv';

  if (bypassPrivateShim) {
    response = NextResponse.next({ request: { headers: requestHeaders } });
  } else if (pathname === '/sv' || pathname.startsWith('/sv/') || pathname === '/en' || pathname.startsWith('/en/')) {
    const url = request.nextUrl.clone();
    url.pathname = `${PRIVATE_PREFIX}${pathname}`;
    response = NextResponse.redirect(url, 307);
  } else if (pathname === PRIVATE_PREFIX) {
    const url = request.nextUrl.clone();
    url.pathname = `${PRIVATE_PREFIX}/${savedLocale}`;
    response = NextResponse.redirect(url, 307);
  } else if (pathname.startsWith(`${PRIVATE_PREFIX}/`)) {
    const internalPath = pathname.slice(PRIVATE_PREFIX.length) || `/${savedLocale}`;
    const url = request.nextUrl.clone();
    url.pathname = internalPath;
    response = NextResponse.rewrite(url, { request: { headers: requestHeaders } });
  } else {
    response = NextResponse.next({ request: { headers: requestHeaders } });
  }

  response.headers.set('X-Robots-Tag', 'noindex, nofollow, noarchive, nosnippet, noimageindex');
  response.headers.set('X-Request-ID', requestId);

  // Public hyrbart.se/ is intentionally only the logo holding page.
  // Authentication remains available solely through the private app path.
  if (pathname === '/') return response;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!supabaseUrl || !supabaseKey) return response;

  const supabase = createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() { return request.cookies.getAll(); },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  const {data:{user}}=await supabase.auth.getUser();
  const isApi=pathname==='/api'||pathname.startsWith('/api/');
  if(!user&&!isApi&&!isPublicAuthPath(pathname)&&!isStudioPath(pathname)){
    const locale=localeFor(pathname,savedLocale);
    const login=request.nextUrl.clone();
    login.pathname=`${PRIVATE_PREFIX}/${locale}/logga-in`;
    const next=`${pathname}${request.nextUrl.search}`;
    login.search='';
    login.searchParams.set('next',next);
    const redirect=NextResponse.redirect(login,307);
    redirect.headers.set('X-Robots-Tag','noindex, nofollow, noarchive, nosnippet, noimageindex');
    redirect.headers.set('X-Request-ID',requestId);
    response.cookies.getAll().forEach(cookie=>redirect.cookies.set(cookie));
    return redirect;
  }
  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|icon.svg|hyrbart-h-v2.svg|app-icon-192|app-icon-512|apple-icon|apple-touch-icon.png).*)'],
};
