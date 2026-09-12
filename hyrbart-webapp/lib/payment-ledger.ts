import 'server-only';
import { createAdminClient } from '@/lib/supabase/admin';

export type PaymentLedgerBooking = {
  id: string;
  renter_id: string;
  owner_id: string;
  currency?: string | null;
  rental_price?: number | null;
  service_fee?: number | null;
  total_price?: number | null;
};

export async function ensureSimulatedCapture(booking: PaymentLedgerBooking) {
  const admin = createAdminClient();
  const idempotencyKey = `booking:${booking.id}:capture:v1`;
  const amount = Number(booking.total_price ?? (Number(booking.rental_price || 0) + Number(booking.service_fee || 0)));
  const rentalAmount = Number(booking.rental_price || 0);
  const serviceFee = Number(booking.service_fee || 0);
  const currency = booking.currency || 'SEK';

  const { data: existing, error: loadError } = await admin
    .from('booking_payments')
    .select('*')
    .eq('idempotency_key', idempotencyKey)
    .maybeSingle();
  if (loadError) throw loadError;
  if (existing) return existing;

  const now = new Date().toISOString();
  const { data, error } = await admin.from('booking_payments').insert({
    booking_id: booking.id,
    payer_id: booking.renter_id,
    provider: 'simulation',
    provider_payment_id: `sim_${booking.id}`,
    status: 'captured',
    amount,
    rental_amount: rentalAmount,
    service_fee: serviceFee,
    currency,
    idempotency_key: idempotencyKey,
    captured_at: now,
    updated_at: now,
  }).select('*').single();

  if (error?.code === '23505') {
    const { data: raced, error: racedError } = await admin
      .from('booking_payments')
      .select('*')
      .eq('idempotency_key', idempotencyKey)
      .single();
    if (racedError) throw racedError;
    return raced;
  }
  if (error) throw error;
  return data;
}

export async function recordSimulatedRefund(bookingId: string, refundAmount: number) {
  const admin = createAdminClient();
  const { data: payment, error: loadError } = await admin
    .from('booking_payments')
    .select('*')
    .eq('booking_id', bookingId)
    .in('status', ['captured', 'partially_refunded', 'refunded'])
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (loadError) throw loadError;
  if (!payment) return null;

  const normalizedRefund = Math.max(0, Math.min(Number(refundAmount || 0), Number(payment.amount || 0)));
  const status = normalizedRefund >= Number(payment.amount || 0) ? 'refunded' : normalizedRefund > 0 ? 'partially_refunded' : payment.status;
  const now = new Date().toISOString();
  const { data, error } = await admin.from('booking_payments').update({
    refund_amount: normalizedRefund,
    status,
    refunded_at: normalizedRefund > 0 ? now : payment.refunded_at,
    updated_at: now,
  }).eq('id', payment.id).select('*').single();
  if (error) throw error;
  return data;
}

export async function ensureScheduledPayout(booking: PaymentLedgerBooking) {
  const admin = createAdminClient();
  const now = new Date().toISOString();
  const row = {
    booking_id: booking.id,
    owner_id: booking.owner_id,
    provider: 'simulation',
    status: 'scheduled',
    amount: Number(booking.rental_price || 0),
    currency: booking.currency || 'SEK',
    due_at: now,
    updated_at: now,
  };
  const { data, error } = await admin.from('booking_payouts')
    .upsert(row, { onConflict: 'booking_id', ignoreDuplicates: true })
    .select('*')
    .single();
  if (!error) return data;

  const { data: existing, error: existingError } = await admin
    .from('booking_payouts').select('*').eq('booking_id', booking.id).single();
  if (existingError) throw existingError;
  return existing;
}
