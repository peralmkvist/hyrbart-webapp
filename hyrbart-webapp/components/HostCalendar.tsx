'use client';

import { useMemo, useState } from 'react';
import { BackIcon, ForwardIcon, ListIcon, ListingsIcon } from './Icons';

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function addMonths(date: Date, amount: number) {
  return new Date(date.getFullYear(), date.getMonth() + amount, 1);
}

export default function HostCalendar({ locale }: { locale: string }) {
  const en = locale === 'en';
  const today = useMemo(() => new Date(), []);
  const [month, setMonth] = useState(startOfMonth(today));
  const [view, setView] = useState<'month' | 'list'>('month');
  const [viewMenuOpen, setViewMenuOpen] = useState(false);

  const monthLabel = new Intl.DateTimeFormat(en ? 'en-GB' : 'sv-SE', {
    month: 'long',
    year: 'numeric',
  }).format(month);

  const weekdayLabels = en
    ? ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
    : ['Mån', 'Tis', 'Ons', 'Tor', 'Fre', 'Lör', 'Sön'];

  const firstDay = month.getDay() === 0 ? 6 : month.getDay() - 1;
  const daysInMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const previousMonthDays = new Date(month.getFullYear(), month.getMonth(), 0).getDate();

  const cells = Array.from({ length: 42 }, (_, index) => {
    const relative = index - firstDay + 1;
    if (relative < 1) return { day: previousMonthDays + relative, outside: true, monthOffset: -1 };
    if (relative > daysInMonth) return { day: relative - daysInMonth, outside: true, monthOffset: 1 };
    return { day: relative, outside: false, monthOffset: 0 };
  });

  const isToday = (day: number, outside: boolean) =>
    !outside &&
    today.getFullYear() === month.getFullYear() &&
    today.getMonth() === month.getMonth() &&
    today.getDate() === day;

  const selectView = (nextView: 'month' | 'list') => {
    setView(nextView);
    setViewMenuOpen(false);
  };

  return (
    <section className="hostCalendarPage">
      <div className="hostCalendarTop">
        <div className="hostCalendarTopActions">
          <button type="button" className="hostCalendarToday" onClick={() => setMonth(startOfMonth(today))}>
            {en ? 'Today' : 'Idag'}
          </button>
          <div className="hostCalendarViewPicker">
            <button
              type="button"
              className="hostCalendarViewButton"
              aria-label={en ? 'Choose calendar view' : 'Välj kalendervy'}
              aria-expanded={viewMenuOpen}
              onClick={() => setViewMenuOpen((open) => !open)}
            >
              {view === 'month' ? <ListingsIcon /> : <ListIcon />}
            </button>
            {viewMenuOpen && (
              <div className="hostCalendarViewMenu" role="menu">
                <button type="button" className={view === 'list' ? 'active' : ''} onClick={() => selectView('list')} role="menuitem">
                  <span>{en ? 'List' : 'Lista'}</span><ListIcon />
                </button>
                <button type="button" className={view === 'month' ? 'active' : ''} onClick={() => selectView('month')} role="menuitem">
                  <span>{en ? 'Month' : 'Månad'}</span><ListingsIcon />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="hostCalendarToolbar">
        <div>
          <span className="hostCalendarEyebrow">{en ? 'Availability' : 'Tillgänglighet'}</span>
          <strong>{monthLabel}</strong>
        </div>
        <div className="hostCalendarArrows" aria-label={en ? 'Change month' : 'Byt månad'}>
          <button type="button" onClick={() => setMonth((current) => addMonths(current, -1))} aria-label={en ? 'Previous month' : 'Föregående månad'}><BackIcon /></button>
          <button type="button" onClick={() => setMonth((current) => addMonths(current, 1))} aria-label={en ? 'Next month' : 'Nästa månad'}><ForwardIcon /></button>
        </div>
      </div>

      <div className="hostListingFilter" role="button" tabIndex={0}>
        <span>{en ? 'All listings' : 'Alla annonser'}</span>
        <ForwardIcon />
      </div>

      {view === 'month' ? (
        <>
          <div className="hostCalendarCard">
            <div className="hostCalendarWeekdays">{weekdayLabels.map((label) => <span key={label}>{label}</span>)}</div>
            <div className="hostCalendarGrid">
              {cells.map((cell, index) => (
                <button type="button" key={`${cell.monthOffset}-${cell.day}-${index}`} className={`hostCalendarDay ${cell.outside ? 'outside' : ''} ${isToday(cell.day, cell.outside) ? 'today' : ''}`} aria-label={`${cell.day} ${monthLabel}`}>
                  <span>{cell.day}</span>
                </button>
              ))}
            </div>
          </div>
          <div className="hostCalendarLegend" aria-label={en ? 'Calendar status legend' : 'Förklaring kalenderstatus'}>
            <span><i className="available" />{en ? 'Available' : 'Tillgänglig'}</span>
            <span><i className="blocked" />{en ? 'Blocked' : 'Blockerad'}</span>
            <span><i className="booked" />{en ? 'Booked' : 'Bokad'}</span>
          </div>
        </>
      ) : (
        <div className="hostCalendarList">
          <div className="hostCalendarListMonth">{monthLabel}</div>
          <div className="hostCalendarListEmpty">
            <ListIcon />
            <strong>{en ? 'No bookings this month' : 'Inga bokningar den här månaden'}</strong>
            <p>{en ? 'Upcoming bookings will be shown here in chronological order.' : 'Kommande bokningar visas här i kronologisk ordning.'}</p>
          </div>
        </div>
      )}

      {view === 'month' && (
        <div className="hostCalendarEmpty">
          <strong>{en ? 'No bookings in this month yet' : 'Inga bokningar den här månaden ännu'}</strong>
          <p>{en ? 'Bookings will appear directly in the calendar when we connect the booking flow.' : 'Bokningar kommer visas direkt i kalendern när vi kopplar på bokningsflödet.'}</p>
        </div>
      )}
    </section>
  );
}
