import { createAdminClient } from '@/lib/supabase/admin';

const projectId = 'djps09z6';
const dataset = 'production';
const apiVersion = '2026-09-11';
const queryBase = `https://${projectId}.api.sanity.io/v${apiVersion}/data/query/${dataset}`;

export const BLOCKING_BOOKING_STATUSES = ['requested','reserved','accepted','paid','active','returned'] as const;

export async function hasManualAvailabilityBlock(productId: string, from: string, to: string) {
  const query = `count(*[_type == "availabilityBlock" && product._ref == ${JSON.stringify(productId)} && from <= ${JSON.stringify(to)} && to >= ${JSON.stringify(from)}])`;
  const response = await fetch(`${queryBase}?query=${encodeURIComponent(query)}`, { cache: 'no-store' });
  if (!response.ok) throw new Error(`Sanity availability query failed: ${response.status}`);
  const payload = await response.json() as { result?: number };
  return Number(payload.result || 0) > 0;
}

export async function hasBookingConflict(productId: string, from: string, to: string, excludeBookingId?: string) {
  const admin = createAdminClient();
  let query = admin
    .from('bookings')
    .select('id,status')
    .eq('product_id', productId)
    .lte('start_date', to)
    .gte('end_date', from)
    .in('status', [...BLOCKING_BOOKING_STATUSES])
    .limit(1);
  if (excludeBookingId) query = query.neq('id', excludeBookingId);
  const { data, error } = await query;
  if (error) throw error;
  return Boolean(data?.length);
}

export async function getAvailabilityConflict(productId: string, from: string, to: string, excludeBookingId?: string) {
  const [manualBlock, bookingConflict] = await Promise.all([
    hasManualAvailabilityBlock(productId, from, to),
    hasBookingConflict(productId, from, to, excludeBookingId),
  ]);
  return { unavailable: manualBlock || bookingConflict, manualBlock, bookingConflict };
}
