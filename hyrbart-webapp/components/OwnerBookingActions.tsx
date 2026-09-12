'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function OwnerBookingActions({ bookingId, status, locale }: { bookingId: string; status: string; locale: string }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();
  const en = locale === 'en';
  if (!['requested','reserved'].includes(status)) return null;

  async function update(nextStatus: 'accepted'|'declined') {
    setBusy(true); setError('');
    try {
      const response = await fetch(`/api/bookings/${bookingId}/status`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: nextStatus }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || (en ? 'Could not update booking.' : 'Kunde inte uppdatera bokningen.'));
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : (en ? 'Something went wrong.' : 'Något gick fel.'));
    } finally { setBusy(false); }
  }

  return <section className="bookingDecisionCard">
    <strong>{en ? 'Booking request' : 'Bokningsförfrågan'}</strong>
    <p>{en ? 'Accept to confirm the booking, or decline the request.' : 'Godkänn för att bekräfta bokningen, eller neka förfrågan.'}</p>
    <div className="bookingDecisionActions">
      <button type="button" className="bookingDeclineButton" disabled={busy} onClick={() => update('declined')}>{en ? 'Decline' : 'Neka'}</button>
      <button type="button" className="bookingAcceptButton" disabled={busy} onClick={() => update('accepted')}>{busy ? (en ? 'Saving…' : 'Sparar…') : (en ? 'Accept booking' : 'Godkänn bokning')}</button>
    </div>
    {error ? <small className="bookingDecisionError">{error}</small> : null}
  </section>;
}
