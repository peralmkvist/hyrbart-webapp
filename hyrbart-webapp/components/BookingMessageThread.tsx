'use client';

import { FormEvent, useEffect, useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

type Message = { id: string; sender_id: string; body: string; created_at: string; read_at?: string | null };

export default function BookingMessageThread({ bookingId, locale, counterpartName }: { bookingId: string; locale: string; counterpartName: string }) {
  const en = locale === 'en';
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentUserId, setCurrentUserId] = useState('');
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [live, setLive] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  async function load(silent = false) {
    try {
      const response = await fetch(`/api/bookings/${bookingId}/messages`, { cache: 'no-store' });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Kunde inte hämta meddelanden.');
      setMessages(data.messages ?? []);
      setCurrentUserId(data.currentUserId ?? '');
      if (!silent) setError('');
    } catch (err) { if (!silent) setError(err instanceof Error ? err.message : 'Kunde inte hämta meddelanden.'); }
    finally { if (!silent) setLoading(false); }
  }

  useEffect(() => {
    load();
    const supabase = createClient();
    const channel = supabase
      .channel(`booking-messages-${bookingId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'booking_messages', filter: `booking_id=eq.${bookingId}` }, () => load(true))
      .subscribe(status => setLive(status === 'SUBSCRIBED'));
    const onVisibility = () => { if (document.visibilityState === 'visible') load(true); };
    document.addEventListener('visibilitychange', onVisibility);
    return () => { document.removeEventListener('visibilitychange', onVisibility); void supabase.removeChannel(channel); };
  }, [bookingId]);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); }, [messages.length]);

  async function send(event: FormEvent) {
    event.preventDefault();
    const text = body.trim();
    if (!text || sending) return;
    setSending(true); setError('');
    try {
      const response = await fetch(`/api/bookings/${bookingId}/messages`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ body: text }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || (en ? 'Could not send message.' : 'Kunde inte skicka meddelandet.'));
      setMessages(prev => prev.some(item => item.id === data.message.id) ? prev : [...prev, data.message]);
      setBody('');
    } catch (err) { setError(err instanceof Error ? err.message : (en ? 'Could not send message.' : 'Kunde inte skicka meddelandet.')); }
    finally { setSending(false); }
  }

  return <section className="bookingMessageCard">
    <div className="bookingMessageHeader"><div><span>{en ? 'Messages' : 'Meddelanden'}</span><strong>{counterpartName}</strong></div><small className={`bookingMessageLive${live ? ' connected' : ''}`}>{live ? 'Live' : (en ? 'Connecting…' : 'Ansluter…')}</small></div>
    <div className="bookingMessageList" aria-live="polite">
      {loading ? <p className="bookingMessageEmpty">{en ? 'Loading…' : 'Laddar…'}</p> : messages.length === 0 ? <p className="bookingMessageEmpty">{en ? 'No messages yet. Start the conversation here.' : 'Inga meddelanden ännu. Starta konversationen här.'}</p> : messages.map(message => {
        const mine = message.sender_id === currentUserId;
        return <div className={`bookingBubbleRow ${mine ? 'mine' : 'theirs'}`} key={message.id}><div className="bookingBubble"><p>{message.body}</p><div className="bookingBubbleMeta"><time>{new Intl.DateTimeFormat(en ? 'en-GB' : 'sv-SE', { hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'short' }).format(new Date(message.created_at))}</time>{mine ? <span>{message.read_at ? (en ? 'Read' : 'Läst') : (en ? 'Sent' : 'Skickat')}</span> : null}</div></div></div>;
      })}<div ref={endRef}/>
    </div>
    <form className="bookingMessageComposer" onSubmit={send}><textarea value={body} onChange={e => setBody(e.target.value)} rows={2} maxLength={2000} placeholder={en ? 'Write a message…' : 'Skriv ett meddelande…'} aria-label={en ? 'Message' : 'Meddelande'}/><button type="submit" disabled={sending || !body.trim()}>{sending ? (en ? 'Sending…' : 'Skickar…') : (en ? 'Send' : 'Skicka')}</button></form>
    {error ? <small className="bookingMessageError">{error}</small> : null}
  </section>;
}
