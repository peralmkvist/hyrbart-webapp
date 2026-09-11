'use client';

import { FormEvent, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { SearchIcon } from './Icons';

type Props = {
  locale: string;
  initialQuery?: string;
  category?: string;
  initialFrom?: string;
  initialTo?: string;
  initialPlace?: string;
  initialRadius?: string;
  initiallyCollapsed?: boolean;
};

function compactDate(value: string, en: boolean) {
  if (!value) return '';
  return new Intl.DateTimeFormat(en ? 'en-GB' : 'sv-SE', { day: 'numeric', month: 'short' })
    .format(new Date(`${value}T12:00:00`));
}

function isoDate(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function monthCells(cursor: Date) {
  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const first = new Date(year, month, 1);
  const mondayIndex = (first.getDay() + 6) % 7;
  const days = new Date(year, month + 1, 0).getDate();
  return Array.from({ length: 42 }, (_, i) => {
    const day = i - mondayIndex + 1;
    return day >= 1 && day <= days ? new Date(year, month, day) : null;
  });
}

export default function ProductSearchForm({
  locale,
  initialQuery = '',
  category,
  initialFrom = '',
  initialTo = '',
  initialPlace = 'Danderyd',
  initialRadius = '10',
  initiallyCollapsed = false,
}: Props) {
  const router = useRouter();
  const en = locale === 'en';
  const [expanded, setExpanded] = useState(!initiallyCollapsed);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [query, setQuery] = useState(initialQuery);
  const [from, setFrom] = useState(initialFrom);
  const [to, setTo] = useState(initialTo);
  const [place, setPlace] = useState(initialPlace);
  const [radius, setRadius] = useState(initialRadius);
  const [cursor, setCursor] = useState(() => initialFrom ? new Date(`${initialFrom}T12:00:00`) : new Date());

  const cells = useMemo(() => monthCells(cursor), [cursor]);
  const today = isoDate(new Date());

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const params = new URLSearchParams();
    if (query.trim()) params.set('q', query.trim());
    if (category) params.set('category', category);
    if (from) params.set('from', from);
    if (to) params.set('to', to);
    if (place.trim()) params.set('place', place.trim());
    if (radius) params.set('radius', radius);
    setCalendarOpen(false);
    setExpanded(false);
    window.scrollTo(0, 0);
    router.push(`/${locale}/produkter?${params.toString()}`, { scroll: true });
  }

  function chooseDate(value: string) {
    if (value < today) return;
    if (!from || (from && to)) {
      setFrom(value);
      setTo('');
      return;
    }
    if (value < from) {
      setFrom(value);
      setTo('');
      return;
    }
    setTo(value);
  }

  const dateLabel = from
    ? to
      ? `${compactDate(from, en)} – ${compactDate(to, en)}`
      : compactDate(from, en)
    : (en ? 'Add dates' : 'Lägg till datum');
  const whatLabel = query || (en ? 'All products' : 'Alla produkter');
  const whereLabel = place ? `${place} · ${radius} km` : (en ? 'Add location' : 'Lägg till plats');
  const monthLabel = new Intl.DateTimeFormat(en ? 'en-GB' : 'sv-SE', { month: 'long', year: 'numeric' }).format(cursor);
  const weekdays = en ? ['M','T','W','T','F','S','S'] : ['M','T','O','T','F','L','S'];

  if (!expanded) {
    return (
      <button type="button" className="rentalSearchCompact2" onClick={() => setExpanded(true)} aria-label={en ? 'Edit search' : 'Ändra sökning'}>
        <SearchIcon />
        <span><b>{whatLabel}</b><small>{dateLabel} · {whereLabel}</small></span>
        <span className="rentalSearchEdit2">☰</span>
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="rentalSearchFlow2">
      <label className="rentalSearchField2">
        <span><b>{en ? 'What' : 'Vad'}</b><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={en ? 'What do you need?' : 'Vad behöver du?'} /></span>
        <SearchIcon />
      </label>

      <button type="button" className="rentalSearchRow2" onClick={() => setCalendarOpen((v) => !v)}>
        <span><b>{en ? 'When' : 'När'}</b><small>{dateLabel}</small></span><span className="rentalPlus2">＋</span>
      </button>

      {calendarOpen && (
        <div className="rentalCalendar2">
          <div className="rentalCalendarTop2">
            <button type="button" onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))}>‹</button>
            <strong>{monthLabel}</strong>
            <button type="button" onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))}>›</button>
          </div>
          <div className="rentalWeekdays2">{weekdays.map((d, i) => <span key={`${d}-${i}`}>{d}</span>)}</div>
          <div className="rentalCalendarGrid2">
            {cells.map((date, i) => {
              if (!date) return <span key={`blank-${i}`} />;
              const value = isoDate(date);
              const disabled = value < today;
              const selectedStart = value === from;
              const selectedEnd = value === to;
              const inRange = Boolean(from && to && value > from && value < to);
              return <button type="button" key={value} disabled={disabled} className={`${selectedStart || selectedEnd ? 'selected' : ''} ${inRange ? 'inRange' : ''}`} onClick={() => chooseDate(value)}>{date.getDate()}</button>;
            })}
          </div>
          <div className="rentalCalendarFooter2">
            <button type="button" className="clear" onClick={() => { setFrom(''); setTo(''); }}>{en ? 'Clear' : 'Rensa'}</button>
            <button type="button" className="done" disabled={!from} onClick={() => setCalendarOpen(false)}>{en ? 'Done' : 'Klar'}</button>
          </div>
        </div>
      )}

      <div className="rentalSearchField2 rentalWhereField2">
        <span><b>{en ? 'Where' : 'Var'}</b><input value={place} onChange={(e) => setPlace(e.target.value)} placeholder={en ? 'City or area' : 'Ort eller område'} /></span>
        <label className="rentalRadiusInline2"><small>{radius} km</small><input aria-label={en ? 'Search radius' : 'Sökradie'} type="range" min="1" max="50" step="1" value={radius} onChange={(e) => setRadius(e.target.value)} /></label>
      </div>

      <button type="submit" className="rentalSearchSubmit2"><SearchIcon />{en ? 'Search' : 'Sök'}</button>
    </form>
  );
}
