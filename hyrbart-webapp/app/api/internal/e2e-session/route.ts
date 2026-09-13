import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  if (process.env.E2E_TEST_SUPPORT !== '1') {
    return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 });
  }

  let body: { accessToken?: string; refreshToken?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'INVALID_SESSION' }, { status: 400 });
  }
  if (!body.accessToken || !body.refreshToken) {
    return NextResponse.json({ error: 'INVALID_SESSION' }, { status: 400 });
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.setSession({
    access_token: body.accessToken,
    refresh_token: body.refreshToken,
  });
  if (error || !data.user) {
    return NextResponse.json({ error: 'SESSION_REJECTED' }, { status: 401 });
  }

  return NextResponse.json({ ok: true, userId: data.user.id }, {
    headers: { 'cache-control': 'no-store' },
  });
}
