import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { evaluateActiveSearchAlerts } from '@/lib/search-alerts';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

async function authorized(request: Request) {
  const supplied = request.headers.get('x-hyrbart-search-alert-secret');
  if (!supplied) return false;
  const admin = createAdminClient();
  const { data, error } = await admin.from('search_alert_runtime').select('cron_secret').eq('id', true).maybeSingle();
  if (error || !data?.cron_secret) return false;
  return supplied === data.cron_secret;
}

export async function POST(request: Request) {
  if (!(await authorized(request))) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
  try {
    const result = await evaluateActiveSearchAlerts(100);
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    console.error('Search alert evaluation failed', error);
    return NextResponse.json({ error: 'EVALUATION_FAILED' }, { status: 500 });
  }
}
