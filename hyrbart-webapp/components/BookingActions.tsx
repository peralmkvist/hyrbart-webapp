'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

type Props = { slug: string; from: string; to: string; locale: string };

export default function BookingActions({ slug, from, to, locale }: Props) {
  const en = locale === 'en';
  const router = useRouter();
  const [sending, setSending] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [checking, setChecking] = useState(true);
  const [available, setAvailable] = useState<boolean|null>(null);

  async function checkAvailability() {
    setChecking(true);
    try {
      const params = new URLSearchParams({ slug, from, to });
      const response = await fetch(`/api/availability/check?${params.toString()}`, { cache: 'no-store' });
      const data = await response.json() as { available?: boolean };
      setAvailable(response.ok ? Boolean(data.available) : null);
    } catch { setAvailable(null); }
    finally { setChecking(false); }
  }

  useEffect(() => { void checkAvailability(); }, [slug, from, to]);

  async function send() {
    setSending(true); setFeedback('');
    try {
      const response = await fetch('/api/booking-request-safe', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug, from, to, requestType: 'booking', locale }),
      });
      const data = await response.json() as { error?: string; code?: string; bookingId?: string };
      if (response.status === 401) {
        const next = encodeURIComponent(window.location.pathname + window.location.search);
        router.push(`/topsecret/${locale}/logga-in?next=${next}`); return;
      }
      if (!response.ok) {
        if (data.code === 'DATES_UNAVAILABLE' || (response.status === 409 && data.error?.toLowerCase().includes('tillgäng'))) setAvailable(false);
        throw new Error(data.error || (en ? 'Could not send request.' : 'Kunde inte skicka förfrågan.'));
      }
      if (data.bookingId) { router.push(`/topsecret/${locale}/bokningar/${data.bookingId}`); return; }
      setFeedback(en ? 'Booking request sent.' : 'Bokningsförfrågan är skickad.');
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : (en ? 'Could not send request.' : 'Kunde inte skicka förfrågan.'));
    } finally { setSending(false); }
  }

  const unavailable = available === false;
  return <section className="bookingActions2" aria-label={en ? 'Booking actions' : 'Bokningsalternativ'}>
    {unavailable ? <div className="bookingAvailabilityWarning2" role="status"><strong>{en ? 'Not available for these dates' : 'Inte tillgänglig dessa datum'}</strong><span>{en ? 'The item is booked, reserved or blocked by the host. Change the dates to continue.' : 'Artikeln är bokad, reserverad eller blockerad av uthyraren. Ändra datum för att fortsätta.'}</span></div> : null}
    <button type="button" className="bookingPrimary2" disabled={sending || checking || unavailable} onClick={send}>{checking ? (en ? 'Checking availability…' : 'Kontrollerar tillgänglighet…') : sending ? (en ? 'Sending…' : 'Skickar…') : (en ? 'Send booking request' : 'Skicka bokningsförfrågan')}</button>
    <p className="bookingHelper2">{en ? 'By sending a request you accept Hyrbart’s ' : 'Genom att skicka en förfrågan godkänner du Hyrbarts '}<Link href={`/topsecret/${locale}/hyresvillkor`}>{en ? 'rental terms' : 'hyresvillkor'}</Link>.</p>
    {feedback ? <p className="bookingFeedback2" role="status">{feedback}</p> : null}
  </section>;
}
