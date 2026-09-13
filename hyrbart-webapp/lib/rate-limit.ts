import 'server-only';
import { createAdminClient } from '@/lib/supabase/admin';

export type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  resetAt: string | null;
};

function clientIp(request: Request) {
  const forwarded = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  return request.headers.get('x-real-ip') || forwarded || 'unknown';
}

export async function consumeRateLimit(request: Request, scope: string, limit: number, windowSeconds: number): Promise<RateLimitResult> {
  try {
    const admin = createAdminClient();
    const bucketKey = `${scope}:${clientIp(request)}`.slice(0, 500);
    const { data, error } = await admin.rpc('consume_api_rate_limit', {
      p_bucket_key: bucketKey,
      p_limit: limit,
      p_window_seconds: windowSeconds,
    });
    if (error) throw error;
    const row = Array.isArray(data) ? data[0] : data;
    return {
      allowed: Boolean(row?.allowed),
      remaining: Number(row?.remaining ?? 0),
      resetAt: row?.reset_at ? String(row.reset_at) : null,
    };
  } catch (error) {
    console.error('Rate limiter unavailable; failing open', error);
    return { allowed: true, remaining: limit, resetAt: null };
  }
}
