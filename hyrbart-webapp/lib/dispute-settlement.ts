import 'server-only';
import { createAdminClient } from '@/lib/supabase/admin';
import { recordSimulatedRefund } from '@/lib/payment-ledger';
import { recordBookingEvent } from '@/lib/booking-events';
import { canBookingTransition } from '@/lib/booking-state';

export type ResolutionType = 'full_refund' | 'full_payout' | 'split' | 'no_financial_action';

export async function settleBookingDispute({
  bookingId,
  adminUserId,
  resolutionType,
  refundAmount,
  payoutAmount,
}: {
  bookingId: string;
  adminUserId: string;
  resolutionType: ResolutionType;
  refundAmount?: number | null;
  payoutAmount?: number | null;
}) {
  const admin = createAdminClient();
  const { data: booking, error } = await admin.from('bookings')
    .select('id,status,renter_id,owner_id,currency,rental_price,service_fee,total_price')
    .eq('id', bookingId).maybeSingle();
  if (error) throw error;
  if (!booking) throw new Error('BOOKING_NOT_FOUND');

  const total = Number(booking.total_price ?? (Number(booking.rental_price || 0) + Number(booking.service_fee || 0)));
  const rental = Number(booking.rental_price || 0);
  let refund = 0;
  let payout = 0;

  if (resolutionType === 'full_refund') refund = total;
  if (resolutionType === 'full_payout') payout = rental;
  if (resolutionType === 'split') {
    refund = Math.max(0, Math.round(Number(refundAmount || 0)));
    payout = Math.max(0, Math.round(Number(payoutAmount || 0)));
  }
  if (refund > total) throw new Error('REFUND_EXCEEDS_TOTAL');
  if (payout > rental) throw new Error('PAYOUT_EXCEEDS_RENTAL');
  if (refund + payout > total) throw new Error('SETTLEMENT_EXCEEDS_TOTAL');

  const { data: existingPayout, error: payoutLoadError } = await admin.from('booking_payouts').select('*').eq('booking_id', booking.id).maybeSingle();
  if (payoutLoadError) throw payoutLoadError;
  if (existingPayout?.status === 'paid') {
    const alreadyPaid = Number(existingPayout.amount || 0);
    if (refund > 0 || payout !== alreadyPaid) throw new Error('PAYOUT_ALREADY_PAID');
  }

  const payment = refund > 0 ? await recordSimulatedRefund(booking.id, refund) : null;
  const now = new Date().toISOString();
  let payoutRow = existingPayout;

  if (payout > 0 && existingPayout?.status !== 'paid') {
    const payload = {
      booking_id: booking.id,
      owner_id: booking.owner_id,
      provider: existingPayout?.provider || 'simulation',
      status: 'scheduled',
      amount: payout,
      currency: booking.currency || 'SEK',
      due_at: now,
      updated_at: now,
    };
    const result = existingPayout
      ? await admin.from('booking_payouts').update(payload).eq('id', existingPayout.id).select('*').single()
      : await admin.from('booking_payouts').insert(payload).select('*').single();
    if (result.error) throw result.error;
    payoutRow = result.data;
  } else if (payout === 0 && existingPayout && ['pending','scheduled'].includes(existingPayout.status)) {
    const { data, error: payoutError } = await admin.from('booking_payouts').update({ status: 'cancelled', updated_at: now }).eq('id', existingPayout.id).select('*').single();
    if (payoutError) throw payoutError;
    payoutRow = data;
  }

  let finalStatus = booking.status;
  if (booking.status === 'disputed') {
    const desired = resolutionType === 'full_refund' ? 'refunded' : 'completed';
    if (!canBookingTransition('disputed', desired, 'admin')) throw new Error('INVALID_FINAL_TRANSITION');
    const { data: updated, error: updateError } = await admin.from('bookings')
      .update({ status: desired, refund_amount: refund, updated_at: now })
      .eq('id', booking.id).eq('status', 'disputed').select('status').maybeSingle();
    if (updateError) throw updateError;
    finalStatus = updated?.status || finalStatus;
  }

  await recordBookingEvent({
    bookingId: booking.id,
    actorId: adminUserId,
    eventType: 'dispute_settled',
    metadata: {
      resolution_type: resolutionType,
      refund_amount: refund,
      payout_amount: payout,
      payment_id: payment?.id || null,
      payout_id: payoutRow?.id || null,
      final_status: finalStatus,
      simulated: (payment?.provider || payoutRow?.provider || 'simulation') === 'simulation',
    },
  });

  return { booking, resolutionType, refundAmount: refund, payoutAmount: payout, payment, payout: payoutRow, finalStatus };
}
