import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const PRIVATE_PREFIX = '/topsecret';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  let response: NextResponse;

  if (pathname === '/sv' || pathname.startsWith('/sv/') || pathname === '/en' || pathname.startsWith('/en/')) {
    const url = request.nextUrl.clone();
    url.pathname = `${PRIVATE_PREFIX}${pathname}`;
    response = NextResponse.redirect(url, 307);
  } else if (pathname === PRIVATE_PREFIX) {
    const url = request.nextUrl.clone();
    url.pathname = `${PRIVATE_PREFIX}/sv`;
    response = NextResponse.redirect(url, 307);
  } else if (pathname.startsWith(`${PRIVATE_PREFIX}/`)) {
    const internalPath = pathname.slice(PRIVATE_PREFIX.length) || '/sv';
    const url = request.nextUrl.clone();
    url.pathname = internalPath;
    response = NextResponse.rewrite(url);
  } else {
    response = NextResponse.next({ request });
  }

  response.headers.set('X-Robots-Tag', 'noindex, nofollow, noarchive, nosnippet, noimageindex');

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!supabaseUrl || !supabaseKey) return response;

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

  await supabase.auth.getUser();
  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|icon.svg|hyrbart-h-v2.svg|app-icon-192|app-icon-512|apple-icon|apple-touch-icon.png).*)'],
};
