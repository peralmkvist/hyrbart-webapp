'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { ListIcon, ListingsIcon } from './Icons';

type Booking = {
  id: string;
  from: string;
  to: string;
  status?: string;
  requestType?: string;
  demo?: boolean;
  product?: { slug?: string; brand?: string; name?: string; image?: string };
};

function startOfMonth(date: Date) { return new Date(date.getFullYear(), date.getMonth(), 1); }
function addMonths(date: Date, amount: number) { return new Date(date.getFullYear(), date.getMonth() + amount, 1); }
function iso(date: Date) { return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`; }
function monthDays(month: Date) {
  const firstDay = month.getDay() === 0 ? 6 : month.getDay() - 1;
  const daysInMonth = new Date(month.getFullYear(), month.getMonth()+1, 0).getDate();
  return Array.from({ length: firstDay + daysInMonth }, (_, index) => {
    const day = index - firstDay + 1;
    return day > 0 ? new Date(month.getFullYear(), month.getMonth(), day) : null;
  });
}

export default function RenterCalendar({ locale }: { locale: string }) {
  const en = locale === 'en';
  const today = useMemo(() => new Date(), []);
  const todayIso = iso(today);
  const [baseMonth, setBaseMonth] = useState(startOfMonth(today));
  const [view, setView] = useState<'month'|'list'>('month');
  const [viewMenuOpen, setViewMenuOpen] = useState(false);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    fetch('/api/booking-requests', { cache: 'no-store' })
      .then(async response => response.ok ? response.json() : { bookings: [] })
      .then(data => { if (active) setBookings(Array.isArray(data.bookings) ? data.bookings : []); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const demoBooking: Booking = useMemo(() => ({
    id: 'demo-renter-booking',
    from: '2026-09-26',
    to: '2026-09-27',
    status: 'booked',
    demo: true,
    product: { brand: 'Bosch', name: 'GKS 18V-57 G' },
  }), []);

  const allBookings = useMemo(() => [demoBooking, ...bookings], [demoBooking, bookings]);
  const weekdayLabels = en ? ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'] : ['Mån','Tis','Ons','Tor','Fre','Lör','Sön'];
  const months = useMemo(() => Array.from({ length: 12 }, (_, index) => addMonths(baseMonth, index)), [baseMonth]);
  const bookingsOnDate = (date:string) => allBookings.filter(booking => booking.from <= date && booking.to >= date && !['rejected','declined'].includes(booking.status || ''));
  const upcomingBookings = useMemo(() => allBookings
    .filter(booking => booking.to >= todayIso && !['rejected','declined'].includes(booking.status || ''))
    .sort((a,b) => a.from.localeCompare(b.from) || a.to.localeCompare(b.to)), [allBookings, todayIso]);
  const statusLabel = (booking:Booking) => {
    if (booking.status === 'accepted' || booking.status === 'booked') return en ? 'Booked' : 'Bokad';
    return en ? 'Pending' : 'Inväntar svar';
  };

  return (
    <section className="hostCalendarPage renterCalendarPage">
      <div className="hostCalendarTop">
        <h1 style={{margin:0,marginRight:'auto',fontSize:'1.75rem',lineHeight:1.08,letterSpacing:'-.035em'}}>{en?'Your booking calendar':'Din bokningskalender'}</h1>
        <div className="hostCalendarTopActions">
          <button type="button" className="hostCalendarToday" onClick={() => setBaseMonth(startOfMonth(today))}>{en?'Today':'Idag'}</button>
          <div className="hostCalendarViewPicker">
            <button type="button" className="hostCalendarViewButton" aria-expanded={viewMenuOpen} onClick={() => setViewMenuOpen(v=>!v)}>{view==='month'?<ListingsIcon/>:<ListIcon/>}</button>
            {viewMenuOpen&&<div className="hostCalendarViewMenu" role="menu"><button type="button" className={view==='list'?'active':''} onClick={()=>{setView('list');setViewMenuOpen(false)}}><span>{en?'List':'Lista'}</span><ListIcon/></button><button type="button" className={view==='month'?'active':''} onClick={()=>{setView('month');setViewMenuOpen(false)}}><span>{en?'Calendar':'Kalender'}</span><ListingsIcon/></button></div>}
          </div>
        </div>
      </div>

      {view==='month' ? <>
        <div className="hostCalendarMonthsScroll">
          {months.map((month) => {
            const monthLabel = new Intl.DateTimeFormat(en ? 'en-GB' : 'sv-SE', { month: 'long', year: 'numeric' }).format(month);
            const cells = monthDays(month);
            return <section className="hostCalendarMonthSection" key={`${month.getFullYear()}-${month.getMonth()}`}>
              <strong className="hostCalendarMonthTitle">{monthLabel}</strong>
              <div className="hostCalendarCard hostCalendarStackedCard">
                <div className="hostCalendarWeekdays">{weekdayLabels.map(label=><span key={label}>{label}</span>)}</div>
                <div className="hostCalendarGrid hostCalendarStackedGrid">{cells.map((date,index)=>{
                  if (!date) return <span className="hostCalendarBlankDay" key={`blank-${index}`} />;
                  const dateIso = iso(date);
                  const dayBookings=bookingsOnDate(dateIso);
                  const demoDay=dayBookings.some(b=>b.demo);
                  const booked=dayBookings.some(b=>b.status==='accepted'||b.status==='booked');
                  const pending=dayBookings.some(b=>!['accepted','booked','rejected','declined'].includes(b.status||''));
                  const cls=`hostCalendarDay ${dateIso===todayIso?'today ':''}${dayBookings.length?'blocked ':''}`;
                  const content=<><span>{date.getDate()}</span>{dayBookings.length>0&&<i style={{width:6,height:6,borderRadius:'50%',background:booked?'#111':pending?'var(--accent)':'#aaa',position:'absolute',bottom:5}}/>}</>;
                  return demoDay
                    ? <Link key={dateIso} href={`/${locale}/bokningar/demo`} className={cls} aria-label={`${dateIso} ${en?'open booking':'öppna bokning'}`} style={{textDecoration:'none'}}>{content}</Link>
                    : <div key={dateIso} className={cls} aria-label={dateIso}>{content}</div>;
                })}</div>
              </div>
            </section>;
          })}
        </div>
        <div className="hostCalendarLegend"><span><i className="available"/>{en?'No booking':'Ingen bokning'}</span><span><i className="booked"/>{en?'Booked':'Bokad'}</span><span><i style={{background:'var(--accent)'}}/>{en?'Pending':'Inväntar svar'}</span></div>
      </> : <div className="hostCalendarList">
        {loading&&bookings.length===0?<div className="hostCalendarListEmpty"><strong>{en?'Loading…':'Laddar…'}</strong></div>:upcomingBookings.length?upcomingBookings.map(booking=>{
          const name=[booking.product?.brand,booking.product?.name].filter(Boolean).join(' ') || (en?'Product':'Produkt');
          const content=<><strong>{name}</strong><div style={{color:'var(--muted)',marginTop:4}}>{booking.from}{booking.to!==booking.from?` – ${booking.to}`:''} · {statusLabel(booking)}</div></>;
          if (booking.demo) return <Link href={`/${locale}/bokningar/demo`} key={booking.id} style={{display:'block',padding:'14px 4px',borderBottom:'1px solid var(--line)',color:'inherit'}}>{content}</Link>;
          return booking.product?.slug ? <Link href={`/${locale}/produkter/${booking.product.slug}`} key={booking.id} style={{display:'block',padding:'14px 4px',borderBottom:'1px solid var(--line)',color:'inherit'}}>{content}</Link> : <div key={booking.id} style={{padding:'14px 4px',borderBottom:'1px solid var(--line)'}}>{content}</div>;
        }):<div className="hostCalendarListEmpty"><ListIcon/><strong>{en?'No upcoming bookings':'Inga kommande bokningar'}</strong></div>}
      </div>}
    </section>
  );
}
