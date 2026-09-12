import 'server-only';
import { createAdminClient } from '@/lib/supabase/admin';

const BLOCKING_STATUSES = ['requested','reserved','accepted','paid','active','returned'];

export async function getUnavailableProductIds(from?: string, to?: string): Promise<Set<string>> {
  if (!from) return new Set();
  const end = to || from;
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from('bookings')
      .select('product_id')
      .lte('start_date', end)
      .gte('end_date', from)
      .in('status', BLOCKING_STATUSES);
    if (error) throw error;
    return new Set((data ?? []).map(row => row.product_id).filter((id): id is string => Boolean(id)));
  } catch (error) {
    console.error('Could not load booking availability from Supabase.', error);
    return new Set();
  }
}
