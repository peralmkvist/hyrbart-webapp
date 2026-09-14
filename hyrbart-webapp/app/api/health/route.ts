import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { correlationIdFromRequest, errorSummary, logOperationalEvent } from '@/lib/observability';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const correlationId = correlationIdFromRequest(request);
  const started = Date.now();
  try {
    const admin = createAdminClient();
    const { error } = await admin.from('bookings').select('id').limit(1);
    if (error) throw error;
    const durationMs = Date.now() - started;
    await logOperationalEvent({
      correlationId,
      severity: 'info',
      eventType: 'health_check_ok',
      source: 'api.health',
      route: '/api/health',
      message: 'Health check passed',
      metadata: { duration_ms: durationMs, database: 'ok', commit: process.env.VERCEL_GIT_COMMIT_SHA || null },
      persist: false,
    });
    return NextResponse.json({ ok: true, database: 'ok', commit: process.env.VERCEL_GIT_COMMIT_SHA || null }, {
      headers: { 'cache-control': 'no-store', 'x-request-id': correlationId },
    });
  } catch (error) {
    await logOperationalEvent({
      correlationId,
      severity: 'critical',
      eventType: 'health_check_failed',
      source: 'api.health',
      route: '/api/health',
      message: 'Health check failed',
      metadata: { duration_ms: Date.now() - started, error: errorSummary(error) },
    });
    return NextResponse.json({ ok: false, database: 'unavailable', commit: process.env.VERCEL_GIT_COMMIT_SHA || null }, {
      status: 503,
      headers: { 'cache-control': 'no-store', 'x-request-id': correlationId },
    });
  }
}
