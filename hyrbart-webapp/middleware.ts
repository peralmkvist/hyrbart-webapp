import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const PRIVATE_PREFIX = '/topsecret';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname === '/sv' || pathname.startsWith('/sv/') || pathname === '/en' || pathname.startsWith('/en/')) {
    const url = request.nextUrl.clone();
    url.pathname = `${PRIVATE_PREFIX}${pathname}`;
    const response = NextResponse.redirect(url, 307);
    response.headers.set('X-Robots-Tag', 'noindex, nofollow, noarchive, nosnippet, noimageindex');
    return response;
  }

  if (pathname === PRIVATE_PREFIX) {
    const url = request.nextUrl.clone();
    url.pathname = `${PRIVATE_PREFIX}/sv`;
    const response = NextResponse.redirect(url, 307);
    response.headers.set('X-Robots-Tag', 'noindex, nofollow, noarchive, nosnippet, noimageindex');
    return response;
  }

  if (pathname.startsWith(`${PRIVATE_PREFIX}/`)) {
    const internalPath = pathname.slice(PRIVATE_PREFIX.length) || '/sv';
    const url = request.nextUrl.clone();
    url.pathname = internalPath;
    const response = NextResponse.rewrite(url);
    response.headers.set('X-Robots-Tag', 'noindex, nofollow, noarchive, nosnippet, noimageindex');
    return response;
  }

  const response = NextResponse.next();
  response.headers.set('X-Robots-Tag', 'noindex, nofollow, noarchive, nosnippet, noimageindex');
  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|icon.svg|hyrbart-h-v2.svg|app-icon-192|app-icon-512|apple-icon|apple-touch-icon.png).*)'],
};
