'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { ForwardIcon, ListIcon, ListingsIcon } from './Icons';
import CalendarTodayJump from './CalendarTodayJump';

type Booking = {
  id: string;
  from: string;
  to: string;
  status?: string;
  requestType?: string;
  total?: number;
  role?: 'owner'|'renter';
  product?: { slug?: string; brand?: string; name?: string; image?: string };
};

type ListFilter = 'all'|'action'|'upcoming'|'active'|'completed';

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
  const router = useRouter();
  const today = useMemo(() => new Date(), []);
  const todayMonth = useMemo(() => startOfMonth(today), [today]);
  const todayIso = iso(today);
  const [view, setView] = useState<'month'|'list'>('list');
  const [viewMenuOpen, setViewMenuOpen] = useState(false);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [listFilter, setListFilter] = useState<ListFilter>('all');

  useEffect(() => {
    let active = true;
    fetch('/api/booking-requests', { cache: 'no-store' })
      .then(async response => response.ok ? response.json() : { bookings: [] })
      .then(data => {
        if (!active) return;
        const rows = Array.isArray(data.bookings) ? data.bookings as Booking[] : [];
        setBookings(rows.filter(booking => booking.role !== 'owner'));
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const weekdayLabels = en ? ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'] : ['Mån','Tis','Ons','Tor','Fre','Lör','Sön'];
  const months = useMemo(() => Array.from({ length: 49 }, (_, index) => addMonths(todayMonth, index - 24)), [todayMonth]);
  const activeStatuses = ['requested','reserved','accepted','paid','active','returned'];
  const bookingsOnDate = (date:string) => bookings.filter(booking => booking.from <= date && booking.to >= date && activeStatuses.includes(booking.status || ''));

  const groupedBookings = useMemo(() => {
    const sorted = [...bookings]
      .filter(booking => !['declined','cancelled','refunded'].includes(booking.status || ''))
      .sort((a,b) => a.from.localeCompare(b.from) || a.to.localeCompare(b.to));
    return {
      action: sorted.filter(booking => ['requested','reserved'].includes(booking.status || '')),
      upcoming: sorted.filter(booking => ['accepted','paid'].includes(booking.status || '') && booking.to >= todayIso),
      active: sorted.filter(booking => booking.status === 'active'),
      completed: sorted.filter(booking => ['returned','completed'].includes(booking.status || '')).reverse(),
    };
  }, [bookings, todayIso]);

  const actionCount = groupedBookings.action.length;
  const visibleGroups = useMemo(() => {
    const groups = [
      { key:'action' as const, title:en?'Awaiting response':'Inväntar svar', items:groupedBookings.action },
      { key:'upcoming' as const, title:en?'Upcoming':'Kommande', items:groupedBookings.upcoming },
      { key:'active' as const, title:en?'Active':'Pågående', items:groupedBookings.active },
      { key:'completed' as const, title:en?'Completed':'Avslutade', items:groupedBookings.completed },
    ];
    return listFilter === 'all' ? groups : groups.filter(group => group.key === listFilter);
  }, [en, groupedBookings, listFilter]);

  const statusLabel = (booking:Booking) => {
    const status = booking.status || '';
    if (status === 'requested') return en ? 'Booking request sent' : 'Bokningsförfrågan skickad';
    if (status === 'reserved') return en ? 'Reserved' : 'Reserverad';
    if (status === 'accepted') return en ? 'Approved' : 'Godkänd';
    if (status === 'paid') return en ? 'Paid' : 'Betald';
    if (status === 'active') return en ? 'Active' : 'Pågående';
    if (status === 'returned') return en ? 'Returned' : 'Återlämnad';
    if (status === 'completed') return en ? 'Completed' : 'Slutförd';
    return en ? 'Booking' : 'Bokning';
  };

  const legend = <div className="hostCalendarLegend renterCalendarInlineLegend"><span><i className="calendarDotBooked"/>{en?'Booked':'Bokad'}</span><span><i className="calendarDotReserved"/>{en?'Reserved':'Reserverad'}</span></div>;

  return (
    <section className="hostCalendarPage renterCalendarPage">
      <div className="hostCalendarTop">
        <h1>{en?'Bookings':'Bokningar'}</h1>
        <div className="hostCalendarTopActions">
          <div className="hostCalendarViewPicker">
            <button type="button" className="hostCalendarViewButton" aria-expanded={viewMenuOpen} onClick={() => setViewMenuOpen(v=>!v)}>{view==='month'?<ListingsIcon/>:<ListIcon/>}</button>
            {viewMenuOpen&&<div className="hostCalendarViewMenu" role="menu"><button type="button" className={view==='list'?'active':''} onClick={()=>{setView('list');setViewMenuOpen(false)}}><span>{en?'List':'Lista'}</span><ListIcon/></button><button type="button" className={view==='month'?'active':''} onClick={()=>{setView('month');setViewMenuOpen(false)}}><span>{en?'Calendar':'Kalender'}</span><ListingsIcon/></button></div>}
          </div>
        </div>
      </div>

      {view==='list' ? <>
        <div className="hostBookingFilterRail" role="tablist" aria-label={en?'Filter bookings':'Filtrera bokningar'}>
          {([
            ['all', en?'All':'Alla'],
            ['action', en?'Awaiting response':'Inväntar svar'],
            ['upcoming', en?'Upcoming':'Kommande'],
            ['active', en?'Active':'Pågående'],
            ['completed', en?'Completed':'Avslutade'],
          ] as Array<[ListFilter,string]>).map(([key,label])=><button key={key} type="button" className={listFilter===key?'active':''} onClick={()=>setListFilter(key)}>{label}{key==='action'&&actionCount>0?<span>{actionCount}</span>:null}</button>)}
        </div>

        <div className="hostCalendarList">
          {loading&&bookings.length===0?<div className="hostCalendarListEmpty"><strong>{en?'Loading…':'Laddar…'}</strong></div>:
            visibleGroups.some(group=>group.items.length>0)?visibleGroups.map(group=>group.items.length?(
              <section className={`hostBookingSection hostBookingSection-${group.key}`} key={group.key}>
                <div className="hostBookingSectionTitle"><strong>{group.title}</strong><span>{group.items.length}</span></div>
                <div className="hostBookingCards">
                  {group.items.map(booking=>{
                    const name=[booking.product?.brand,booking.product?.name].filter(Boolean).join(' ') || (en?'Product':'Produkt');
                    const awaitingResponse=['requested','reserved'].includes(booking.status||'');
                    return <Link href={`/${locale}/bokningar/${booking.id}`} key={booking.id} className={`hostBookingCard ${awaitingResponse?'needsAction':''}`} style={{display:'block',color:'inherit',textDecoration:'none'}}>
                      <div className="hostBookingCardTop">
                        <div>
                          <span className="hostBookingStatus">{statusLabel(booking)}</span>
                          <h3>{name}</h3>
                        </div>
                        <ForwardIcon/>
                      </div>
                      <div className="hostBookingMeta">
                        <strong>{booking.from}{booking.to!==booking.from?` – ${booking.to}`:''}</strong>
                        {typeof booking.total === 'number' ? <span>{booking.total.toLocaleString(en?'en-GB':'sv-SE')} kr</span> : null}
                      </div>
                    </Link>;
                  })}
                </div>
              </section>
            ):null):<div className="hostCalendarListEmpty"><ListIcon/><strong>{en?'No bookings':'Inga bokningar'}</strong></div>}
        </div>
      </> : <>
        <div className="hostCalendarMonthsScroll">
          <div className="renterCalendarLegendDock">{legend}</div>
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
                    ? <button
                        type="button"
                        key={dateIso}
                        className={cls}
                        aria-label={`${dateIso} ${en?'open booking':'öppna bokning'}`}
                        onClick={() => router.push(`/${locale}/bokningar/${booking.id}`)}
                        style={{textDecoration:'none',cursor:'pointer',touchAction:'manipulation',WebkitTapHighlightColor:'transparent'}}
                      >{content}</button>
                    : <div key={dateIso} className={cls} aria-label={dateIso}>{content}</div>;
                })}</div>
              </div>
            </section>;
          })}
        </div>
        <CalendarTodayJump active={view==='month'} />
      </>}
    </section>
  );
}
