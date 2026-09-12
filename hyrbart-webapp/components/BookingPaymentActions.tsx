'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

type Props = {
  bookingId: string;
  status: string;
  locale: string;
};

export default function BookingPaymentActions({ bookingId, status, locale }: Props) {
  const en = locale === 'en';
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const canPay = status === 'accepted';
  const canCancel = ['requested','reserved','accepted','paid'].includes(status);
  if (!canPay && !canCancel) return null;

  async function pay() {
    setBusy(true); setError('');
    try {
      const response = await fetch(`/api/bookings/${bookingId}/pay`, { method: 'POST' });
      const data = await response.json() as { error?: string };
      if (!response.ok) throw new Error(data.error || (en ? 'Could not complete payment.' : 'Kunde inte genomföra betalningen.'));
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : (en ? 'Could not complete payment.' : 'Kunde inte genomföra betalningen.'));
    } finally { setBusy(false); }
  }

  async function cancel() {
    if (!window.confirm(status === 'paid'
      ? (en ? 'Cancel this booking? The payment will be marked as refunded in test mode.' : 'Avboka bokningen? Betalningen markeras som återbetald i testläget.')
      : (en ? 'Cancel this booking?' : 'Avboka bokningen?'))) return;
    setBusy(true); setError('');
    try {
      const response = await fetch(`/api/bookings/${bookingId}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'cancelled' }),
      });
      const data = await response.json() as { error?: string };
      if (!response.ok) throw new Error(data.error || (en ? 'Could not cancel booking.' : 'Kunde inte avboka bokningen.'));
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : (en ? 'Could not cancel booking.' : 'Kunde inte avboka bokningen.'));
    } finally { setBusy(false); }
  }

  return <section className="bookingPaymentActions">
    {canPay ? <div className="bookingPaymentCallout">
      <span>{en ? 'Next step' : 'Nästa steg'}</span>
      <strong>{en ? 'Pay to confirm the booking' : 'Betala för att bekräfta bokningen'}</strong>
      <small>{en ? 'Test mode: no money will be charged.' : 'Testläge: inga riktiga pengar dras.'}</small>
      <button type="button" disabled={busy} onClick={pay}>{busy ? (en ? 'Processing…' : 'Bearbetar…') : (en ? 'Pay booking' : 'Betala bokningen')}</button>
    </div> : null}
    {canCancel ? <button type="button" className="bookingCancelAction" disabled={busy} onClick={cancel}>{en ? 'Cancel booking' : 'Avboka bokning'}</button> : null}
    {error ? <small className="bookingDecisionError" role="alert">{error}</small> : null}
  </section>;
}
