'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

type Props = { bookingId: string; status: string; locale: string };

export default function BookingPaymentActions({ bookingId, status, locale }: Props) {
  const en = locale === 'en';
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const canPay = status === 'accepted';
  if (!canPay) return null;

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

  return <section className="bookingPaymentActions">
    <div className="bookingPaymentCallout">
      <span>{en ? 'Next step' : 'Nästa steg'}</span>
      <strong>{en ? 'Pay to confirm the booking' : 'Betala för att bekräfta bokningen'}</strong>
      <small>{en ? 'Test mode: no money will be charged.' : 'Testläge: inga riktiga pengar dras.'}</small>
      <button type="button" disabled={busy} onClick={pay}>{busy ? (en ? 'Processing…' : 'Bearbetar…') : (en ? 'Pay booking' : 'Betala bokningen')}</button>
    </div>
    {error ? <small className="bookingDecisionError" role="alert">{error}</small> : null}
  </section>;
}
