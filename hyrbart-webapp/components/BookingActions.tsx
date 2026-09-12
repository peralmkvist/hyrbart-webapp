'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

type Props = {
  slug: string;
  from: string;
  to: string;
  locale: string;
};

export default function BookingActions({ slug, from, to, locale }: Props) {
  const en = locale === 'en';
  const router = useRouter();
  const [mode, setMode] = useState<'booking'|'reserve-question'|null>(null);
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [feedback, setFeedback] = useState('');

  async function send(requestType: 'booking'|'reserve-question') {
    if (requestType === 'reserve-question' && !message.trim()) return;
    setSending(true); setFeedback('');
    try {
      const response = await fetch('/api/booking-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug, from, to, requestType, message }),
      });
      const data = await response.json() as { error?: string; reserved?: boolean; bookingId?: string };
      if (response.status === 401) {
        const next = encodeURIComponent(window.location.pathname + window.location.search);
        router.push(`/topsecret/${locale}/logga-in?next=${next}`);
        return;
      }
      if (!response.ok) throw new Error(data.error || (en ? 'Could not send request.' : 'Kunde inte skicka förfrågan.'));
      if (data.bookingId) {
        router.push(`/topsecret/${locale}/bokningar/${data.bookingId}`);
        return;
      }
      setFeedback(requestType === 'reserve-question'
        ? (en ? 'Reserved while the host answers your question.' : 'Produkten är reserverad medan uthyraren svarar på din fråga.')
        : (en ? 'Booking request sent.' : 'Bokningsförfrågan är skickad.'));
      setMode(null); setMessage('');
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : (en ? 'Could not send request.' : 'Kunde inte skicka förfrågan.'));
    } finally { setSending(false); }
  }

  return <section className="bookingActions2" aria-label={en ? 'Booking actions' : 'Bokningsalternativ'}>
    <button type="button" className="bookingPrimary2" disabled={sending} onClick={() => send('booking')}>{sending ? (en ? 'Sending…' : 'Skickar…') : (en ? 'Send booking request' : 'Skicka bokningsförfrågan')}</button>
    <button type="button" className="bookingSecondary2" disabled={sending} onClick={() => setMode('reserve-question')}>{en ? 'Reserve and ask a question' : 'Reservera och skicka fråga'}</button>
    <p className="bookingHelper2">{en ? 'Reservation temporarily blocks the selected dates while you wait for an answer.' : 'En reservation blockerar tillfälligt de valda datumen medan du väntar på svar.'}</p>
    {feedback ? <p className="bookingFeedback2" role="status">{feedback}</p> : null}
    {mode === 'reserve-question' ? <div className="bookingQuestionOverlay2" role="dialog" aria-modal="true" onClick={() => !sending && setMode(null)}>
      <div className="bookingQuestionSheet2" onClick={(event) => event.stopPropagation()}>
        <h2>{en ? 'What do you want to ask?' : 'Vad vill du fråga?'}</h2>
        <p>{en ? 'The selected dates will be reserved when you send your question.' : 'De valda datumen reserveras när du skickar frågan.'}</p>
        <textarea autoFocus value={message} onChange={(event) => setMessage(event.target.value)} placeholder={en ? 'Write your question…' : 'Skriv din fråga…'} rows={5}/>
        <div className="bookingQuestionButtons2"><button type="button" className="bookingCancel2" disabled={sending} onClick={() => setMode(null)}>{en ? 'Cancel' : 'Avbryt'}</button><button type="button" className="bookingPrimary2" disabled={sending || !message.trim()} onClick={() => send('reserve-question')}>{sending ? (en ? 'Sending…' : 'Skickar…') : (en ? 'Reserve and send' : 'Reservera och skicka')}</button></div>
      </div>
    </div> : null}
  </section>;
}
