'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { BackIcon, ForwardIcon, ListIcon, ListingsIcon } from './Icons';

type Booking = {
  id: string;
  from: string;
  to: string;
  status?: string;
  requestType?: string;
  product?: { slug?: string; brand?: string; name?: string; image?: string };
};

function startOfMonth(date: Date) { return new Date(date.getFullYear(), date.getMonth(), 1); }
function addMonths(date: Date, amount: number) { return new Date(date.getFullYear(), date.getMonth() + amount, 1); }
function iso(date: Date) { return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`; }
function cellDate(month: Date, day: number, monthOffset: number) { return new Date(month.getFullYear(), month.getMonth() + monthOffset, day); }

export default function RenterCalendar({ locale }: { locale: string }) {
  const en = locale === 'en';
  const today = useMemo(() => new Date(), []);
  const [month, setMonth] = useState(startOfMonth(today));
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

  const monthLabel = new Intl.DateTimeFormat(en ? 'en-GB' : 'sv-SE', { month: 'long', year: 'numeric' }).format(month);
  const weekdayLabels = en ? ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'] : ['Mån','Tis','Ons','Tor','Fre','Lör','Sön'];
  const firstDay = month.getDay() === 0 ? 6 : month.getDay() - 1;
  const daysInMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const previousMonthDays = new Date(month.getFullYear(), month.getMonth(), 0).getDate();
  const cells = Array.from({ length: 42 }, (_, index) => {
    const relative = index - firstDay + 1;
    if (relative < 1) return { day: previousMonthDays + relative, outside: true, monthOffset: -1 };
    if (relative > daysInMonth) return { day: relative - daysInMonth, outside: true, monthOffset: 1 };
    return { day: relative, outside: false, monthOffset: 0 };
  });

  const bookingsOnDate = (date:string) => bookings.filter(booking => booking.from <= date && booking.to >= date);
  const monthEnd = iso(new Date(month.getFullYear(), month.getMonth()+1, 0));
  const monthStart = iso(month);
  const listBookings = bookings.filter(booking => booking.to >= monthStart && booking.from <= monthEnd);
  const statusLabel = (booking:Booking) => {
    if (booking.status === 'accepted' || booking.status === 'booked') return en ? 'Booked' : 'Bokad';
    if (booking.status === 'rejected' || booking.status === 'declined') return en ? 'Declined' : 'Avböjd';
    return en ? 'Pending' : 'Inväntar svar';
  };

  return (
    <section className="hostCalendarPage renterCalendarPage">
      <div className="hostCalendarTop">
        <div className="hostCalendarTopActions">
          <button type="button" className="hostCalendarToday" onClick={() => setMonth(startOfMonth(today))}>{en?'Today':'Idag'}</button>
          <div className="hostCalendarViewPicker">
            <button type="button" className="hostCalendarViewButton" aria-expanded={viewMenuOpen} onClick={() => setViewMenuOpen(v=>!v)}>{view==='month'?<ListingsIcon/>:<ListIcon/>}</button>
            {viewMenuOpen&&<div className="hostCalendarViewMenu" role="menu"><button type="button" className={view==='list'?'active':''} onClick={()=>{setView('list');setViewMenuOpen(false)}}><span>{en?'List':'Lista'}</span><ListIcon/></button><button type="button" className={view==='month'?'active':''} onClick={()=>{setView('month');setViewMenuOpen(false)}}><span>{en?'Month':'Månad'}</span><ListingsIcon/></button></div>}
          </div>
        </div>
      </div>

      <div className="hostCalendarToolbar">
        <div><span className="hostCalendarEyebrow">{en?'Your bookings':'Dina bokningar'}</span><strong>{monthLabel}</strong></div>
        <div className="hostCalendarArrows"><button type="button" onClick={()=>setMonth(m=>addMonths(m,-1))}><BackIcon/></button><button type="button" onClick={()=>setMonth(m=>addMonths(m,1))}><ForwardIcon/></button></div>
      </div>

      {view==='month' ? <>
        <div className="hostCalendarCard">
          <div className="hostCalendarWeekdays">{weekdayLabels.map(label=><span key={label}>{label}</span>)}</div>
          <div className="hostCalendarGrid">{cells.map((cell,index)=>{
            const date=iso(cellDate(month,cell.day,cell.monthOffset));
            const dayBookings=bookingsOnDate(date);
            const booked=dayBookings.some(b=>b.status==='accepted'||b.status==='booked');
            const pending=dayBookings.some(b=>!['accepted','booked','rejected','declined'].includes(b.status||''));
            const cls=`hostCalendarDay ${cell.outside?'outside ':''}${date===iso(today)?'today ':''}${dayBookings.length?'blocked ':''}`;
            return <div key={`${cell.monthOffset}-${cell.day}-${index}`} className={cls} aria-label={date} style={dayBookings.length?{background:'#f0f0ed'}:undefined}><span>{cell.day}</span>{dayBookings.length>0&&<i style={{width:6,height:6,borderRadius:'50%',background:booked?'#111':pending?'var(--accent)':'#aaa',position:'absolute',bottom:5}}/>}</div>
          })}</div>
        </div>
        <div className="hostCalendarLegend"><span><i className="available"/>{en?'No booking':'Ingen bokning'}</span><span><i className="booked"/>{en?'Booked':'Bokad'}</span><span><i style={{background:'var(--accent)'}}/>{en?'Pending':'Inväntar svar'}</span></div>
      </> : <div className="hostCalendarList"><div className="hostCalendarListMonth">{monthLabel}</div>{loading?<div className="hostCalendarListEmpty"><strong>{en?'Loading…':'Laddar…'}</strong></div>:listBookings.length?listBookings.map(booking=>{
        const name=[booking.product?.brand,booking.product?.name].filter(Boolean).join(' ') || (en?'Product':'Produkt');
        const content=<><strong>{name}</strong><div style={{color:'var(--muted)',marginTop:4}}>{booking.from}{booking.to!==booking.from?` – ${booking.to}`:''} · {statusLabel(booking)}</div></>;
        return booking.product?.slug ? <Link href={`/${locale}/produkter/${booking.product.slug}`} key={booking.id} style={{display:'block',padding:'14px 4px',borderBottom:'1px solid var(--line)',color:'inherit'}}>{content}</Link> : <div key={booking.id} style={{padding:'14px 4px',borderBottom:'1px solid var(--line)'}}>{content}</div>
      }):<div className="hostCalendarListEmpty"><ListIcon/><strong>{en?'No bookings this month':'Inga bokningar den här månaden'}</strong></div>}</div>}
    </section>
  );
}
