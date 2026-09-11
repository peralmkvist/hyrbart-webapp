'use client';

import { useEffect, useMemo, useState } from 'react';
import { usePathname } from 'next/navigation';
import { SearchIcon } from './Icons';

type Tab = 'all' | 'host' | 'renter' | 'support';

type MessageItem = {
  id: string;
  tab: Exclude<Tab, 'all'>;
  name: string;
  initials: string;
  preview: string;
  meta: string;
  time: string;
  unread?: boolean;
};

type BookingRequestItem = { id:string; from:string; to:string; requestType:string; message?:string; status?:string; createdAt?:string; product?:string };

const svItems: MessageItem[] = [
  { id: '1', tab: 'renter', name: 'Anna', initials: 'A', preview: 'Hej! Går det bra att hämta textiltvätten vid 18?', meta: 'Textiltvätt · bokning 12–13 sep', time: '10:02', unread: true },
  { id: '2', tab: 'renter', name: 'Johan', initials: 'J', preview: 'Tack, då lämnar jag tillbaka den i förrådet ikväll.', meta: 'Cirkelsåg · bokning 10–11 sep', time: '09:18' },
  { id: '3', tab: 'host', name: 'Erik', initials: 'E', preview: 'Absolut, den finns tillgänglig hela helgen.', meta: 'Takbox · förfrågan', time: 'Igår', unread: true },
  { id: '4', tab: 'host', name: 'Sara', initials: 'S', preview: 'Jag har uppdaterat priset för helghyran.', meta: 'Arbetsbelysning · annonsfråga', time: 'Igår' },
  { id: '5', tab: 'support', name: 'Hyrbart Support', initials: 'H', preview: 'Vi har tagit emot din fråga och återkommer så snart vi kan.', meta: 'Supportärende #1042', time: 'Mån', unread: true },
  { id: '6', tab: 'support', name: 'Hyrbart Support', initials: 'H', preview: 'Din profil är nu verifierad.', meta: 'Konto & säkerhet', time: 'Sön' },
  { id: '7', tab: 'renter', name: 'Maria', initials: 'M', preview: 'Perfekt, tack! Då ses vi på fredag.', meta: 'Babyskydd · bokning 18–20 sep', time: '6/9' },
  { id: '8', tab: 'host', name: 'Niklas', initials: 'N', preview: 'Kan jag boka från torsdag kväll till söndag?', meta: 'Grovdammsugare · förfrågan', time: '5/9' },
];

const enItems: MessageItem[] = [
  { id: '1', tab: 'renter', name: 'Anna', initials: 'A', preview: 'Hi! Is it okay if I pick up the carpet cleaner at 18:00?', meta: 'Carpet cleaner · booking 12–13 Sep', time: '10:02', unread: true },
  { id: '2', tab: 'renter', name: 'Johan', initials: 'J', preview: 'Thanks, I will return it to the storage room tonight.', meta: 'Circular saw · booking 10–11 Sep', time: '09:18' },
  { id: '3', tab: 'host', name: 'Erik', initials: 'E', preview: 'Absolutely, it is available all weekend.', meta: 'Roof box · inquiry', time: 'Yesterday', unread: true },
  { id: '4', tab: 'host', name: 'Sara', initials: 'S', preview: 'I have updated the weekend rental price.', meta: 'Work light · listing question', time: 'Yesterday' },
  { id: '5', tab: 'support', name: 'Hyrbart Support', initials: 'H', preview: 'We have received your question and will get back to you shortly.', meta: 'Support case #1042', time: 'Mon', unread: true },
  { id: '6', tab: 'support', name: 'Hyrbart Support', initials: 'H', preview: 'Your profile is now verified.', meta: 'Account & security', time: 'Sun' },
  { id: '7', tab: 'renter', name: 'Maria', initials: 'M', preview: 'Perfect, thank you! See you on Friday.', meta: 'Infant car seat · booking 18–20 Sep', time: '6/9' },
  { id: '8', tab: 'host', name: 'Niklas', initials: 'N', preview: 'Can I book from Thursday evening until Sunday?', meta: 'Wet & dry vacuum · inquiry', time: '5/9' },
];

export default function MessageInbox({ locale }: { locale: string }) {
  const en = locale === 'en';
  const pathname = usePathname();
  const hostMode = pathname.includes('/vard/');
  const [tab, setTab] = useState<Tab>('all');
  const [query, setQuery] = useState('');
  const [bookingItems, setBookingItems] = useState<MessageItem[]>([]);

  useEffect(() => {
    let active = true;
    fetch('/api/booking-request', { cache:'no-store' }).then(async response => {
      if (!response.ok) return;
      const data = await response.json() as { requests?: BookingRequestItem[] };
      if (!active) return;
      const mapped = (data.requests ?? []).map((request): MessageItem => {
        const created = request.createdAt ? new Date(request.createdAt) : null;
        const time = created && Number.isFinite(created.getTime()) ? created.toLocaleTimeString(en?'en-GB':'sv-SE',{hour:'2-digit',minute:'2-digit'}) : '';
        const isQuestion = request.requestType === 'reserve-question';
        return {
          id:`booking-${request.id}`,
          tab: hostMode ? 'renter' : 'host',
          name: hostMode ? (en?'New rental request':'Ny hyresförfrågan') : (en?'Booking request':'Bokningsförfrågan'),
          initials: 'H',
          preview: request.message?.trim() || (isQuestion ? (en?'Reservation with a question':'Reservation med fråga') : (en?'Booking request sent':'Bokningsförfrågan skickad')),
          meta: `${request.product || (en?'Product':'Produkt')} · ${request.from} – ${request.to}${isQuestion ? (en?' · reserved':' · reserverad') : ''}`,
          time,
          unread: hostMode && request.status === 'pending',
        };
      });
      setBookingItems(mapped);
    }).catch(() => {});
    return () => { active = false; };
  }, [en, hostMode]);

  const items = [...bookingItems, ...(en ? enItems : svItems)];

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((item) => {
      if (tab !== 'all' && item.tab !== tab) return false;
      if (!q) return true;
      return `${item.name} ${item.preview} ${item.meta}`.toLowerCase().includes(q);
    });
  }, [items, query, tab]);

  const labels = en
    ? { title: 'Messages', all: 'All', host: 'Hosts', renter: 'Renters', support: 'Support', search: 'Search messages' }
    : { title: 'Meddelanden', all: 'Alla', host: 'Uthyrare', renter: 'Hyrare', support: 'Support', search: 'Sök meddelanden' };

  return (
    <section className="messagesPage">
      <header className="messagesHeader">
        <h1>{labels.title}</h1>
        <div className="messagesSearchWrap">
          <SearchIcon />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={labels.search} aria-label={labels.search} />
        </div>
      </header>

      <div className="messagesTabs" role="tablist" aria-label={labels.title}>
        {([
          ['all', labels.all],
          ['host', labels.host],
          ['renter', labels.renter],
          ['support', labels.support],
        ] as [Tab, string][]).map(([value, label]) => (
          <button key={value} type="button" role="tab" aria-selected={tab === value} className={tab === value ? 'active' : ''} onClick={() => setTab(value)}>{label}</button>
        ))}
      </div>

      <div className="messageList">
        {filtered.map((item) => (
          <button type="button" className="messageRow" key={item.id}>
            <span className="messageAvatar">{item.initials}</span>
            <span className="messageCopy">
              <span className="messageTopline"><strong>{item.name}</strong><time>{item.time}</time></span>
              <span className="messagePreview">{item.preview}</span>
              <span className="messageMeta">{item.unread && <i aria-hidden="true" />} {item.meta}</span>
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}
