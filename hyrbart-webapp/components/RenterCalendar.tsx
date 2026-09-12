'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { ListIcon, ListingsIcon } from './Icons';
import CalendarTodayJump from './CalendarTodayJump';

type Booking = {
  id: string;
  from: string;
  to: string;
  status?: string;
  requestType?: string;
  total?: number;
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
  const todayMonth = useMemo(() => startOfMonth(today), [today]);
  const todayIso = iso(today);
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

  const weekdayLabels = en ? ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'] : ['Mån','Tis','Ons','Tor','Fre','Lör','Sön'];
  const months = useMemo(() => Array.from({ length: 49 }, (_, index) => addMonths(todayMonth, index - 24)), [todayMonth]);
  const activeStatuses = ['requested','reserved','accepted','paid','active','returned'];
  const bookingsOnDate = (date:string) => bookings.filter(booking => booking.from <= date && booking.to >= date && activeStatuses.includes(booking.status || ''));
  const upcomingBookings = useMemo(() => bookings
    .filter(booking => booking.to >= todayIso && !['declined','cancelled','refunded'].includes(booking.status || ''))
    .sort((a,b) => a.from.localeCompare(b.from) || a.to.localeCompare(b.to)), [bookings, todayIso]);
  const statusLabel = (booking:Booking) => {
    if (['accepted','paid','active','returned','completed'].includes(booking.status || '')) return en ? 'Booked' : 'Bokad';
    return en ? 'Reserved' : 'Reserverad';
  };

  return (
    <section className="hostCalendarPage renterCalendarPage">
      <div className="hostCalendarTop">
        <h1>{en?'Calendar':'Kalender'}</h1>
        <div className="hostCalendarTopActions">
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
            const currentMonth = month.getFullYear() === todayMonth.getFullYear() && month.getMonth() === todayMonth.getMonth();
            return <section className="hostCalendarMonthSection" data-current-month={currentMonth ? 'true' : undefined} key={`${month.getFullYear()}-${month.getMonth()}`}>
              <strong className="hostCalendarMonthTitle">{monthLabel}</strong>
              <div className="hostCalendarCard hostCalendarStackedCard">
                <div className="hostCalendarWeekdays">{weekdayLabels.map(label=><span key={label}>{label}</span>)}</div>
                <div className="hostCalendarGrid hostCalendarStackedGrid">{cells.map((date,index)=>{
                  if (!date) return <span className="hostCalendarBlankDay" key={`blank-${index}`} />;
                  const dateIso = iso(date);
                  const dayBookings=bookingsOnDate(dateIso);
                  const booking=dayBookings[0];
                  const booked=dayBookings.some(b=>['accepted','paid','active','returned','completed'].includes(b.status||''));
                  const reserved=dayBookings.length>0 && !booked;
                  const cls=`hostCalendarDay ${dateIso===todayIso?'today ':''}${dayBookings.length?'blocked ':''}`;
                  const showDot=dateIso!==todayIso && (booked||reserved);
                  const content=<><span>{date.getDate()}</span>{showDot&&<i className={booked?'calendarDotBooked':'calendarDotReserved'} />}</>;
                  return booking
                    ? <Link key={dateIso} href={`/${locale}/bokningar/${booking.id}`} className={cls} aria-label={`${dateIso} ${en?'open booking':'öppna bokning'}`} style={{textDecoration:'none'}}>{content}</Link>
                    : <div key={dateIso} className={cls} aria-label={dateIso}>{content}</div>;
                })}</div>
              </div>
            </section>;
          })}
        </div>
        <div className="hostCalendarLegend"><span><i className="calendarDotBooked"/>{en?'Booked':'Bokad'}</span><span><i className="calendarDotReserved"/>{en?'Reserved':'Reserverad'}</span></div>
        <CalendarTodayJump active={view==='month'} />
      </> : <div className="hostCalendarList">
        {loading&&bookings.length===0?<div className="hostCalendarListEmpty"><strong>{en?'Loading…':'Laddar…'}</strong></div>:upcomingBookings.length?upcomingBookings.map(booking=>{
          const name=[booking.product?.brand,booking.product?.name].filter(Boolean).join(' ') || (en?'Product':'Produkt');
          return <Link href={`/${locale}/bokningar/${booking.id}`} key={booking.id} style={{display:'block',padding:'14px 4px',borderBottom:'1px solid var(--line)',color:'inherit'}}><strong>{name}</strong><div style={{color:'var(--muted)',marginTop:4}}>{booking.from}{booking.to!==booking.from?` – ${booking.to}`:''} · {statusLabel(booking)}</div></Link>;
        }):<div className="hostCalendarListEmpty"><ListIcon/><strong>{en?'No upcoming bookings':'Inga kommande bokningar'}</strong></div>}
      </div>}
    </section>
  );
}
