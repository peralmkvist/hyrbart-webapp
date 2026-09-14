import { NextResponse } from 'next/server';
import { evaluateActiveSearchAlerts } from '@/lib/search-alerts';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  const authorization = request.headers.get('authorization');
  if (!secret || authorization !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
  }
  try {
    const result = await evaluateActiveSearchAlerts(100);
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    console.error('Search alert evaluation failed', error);
    return NextResponse.json({ error: 'EVALUATION_FAILED' }, { status: 500 });
  }
}
