'use client';

import { FormEvent, KeyboardEvent, useMemo, useRef, useState } from 'react';
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

const RECENT_SEARCHES_KEY = 'hyrbartRecentSearches';

function compactDate(value: string, en: boolean) {
  if (!value) return '';
  return new Intl.DateTimeFormat(en ? 'en-GB' : 'sv-SE', { day: 'numeric', month: 'short' }).format(new Date(`${value}T12:00:00`));
}
function isoDate(date: Date) {
  const y = date.getFullYear(); const m = String(date.getMonth() + 1).padStart(2, '0'); const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}
function monthCells(cursor: Date) {
  const year = cursor.getFullYear(), month = cursor.getMonth();
  const first = new Date(year, month, 1); const mondayIndex = (first.getDay() + 6) % 7; const days = new Date(year, month + 1, 0).getDate();
  return Array.from({ length: mondayIndex + days }, (_, i) => { const day = i - mondayIndex + 1; return day >= 1 && day <= days ? new Date(year, month, day) : null; });
}

export default function ProductSearchForm({ locale, initialQuery = '', category, initialFrom = '', initialTo = '', initialPlace = 'Danderyd', initialRadius = '10', initiallyCollapsed = false }: Props) {
  const router = useRouter(); const en = locale === 'en';
  const placeInputRef = useRef<HTMLInputElement>(null); const calendarScrollRef = useRef<HTMLDivElement>(null);
  const [expanded, setExpanded] = useState(!initiallyCollapsed); const [calendarOpen, setCalendarOpen] = useState(false);
  const [query, setQuery] = useState(initialQuery); const [from, setFrom] = useState(initialFrom); const [to, setTo] = useState(initialTo); const [place, setPlace] = useState(initialPlace); const [radius, setRadius] = useState(initialRadius);
  const today = isoDate(new Date());
  const baseMonth = useMemo(() => { const source = initialFrom ? new Date(`${initialFrom}T12:00:00`) : new Date(); return new Date(source.getFullYear(), source.getMonth(), 1); }, [initialFrom]);
  const months = useMemo(() => Array.from({ length: 12 }, (_, i) => new Date(baseMonth.getFullYear(), baseMonth.getMonth() + i, 1)), [baseMonth]);
  const weekdays = en ? ['M','T','W','T','F','S','S'] : ['M','T','O','T','F','L','S'];

  function rememberSearch(search: { q?: string; from?: string; to?: string; place?: string; radius?: string }) {
    if (typeof window === 'undefined') return;
    try {
      const normalized = { q: search.q?.trim() || '', from: search.from || '', to: search.to || '', place: search.place?.trim() || '', radius: search.radius || '10', ts: Date.now() };
      const key = `${normalized.q}|${normalized.from}|${normalized.to}|${normalized.place}|${normalized.radius}`;
      const current = JSON.parse(window.localStorage.getItem(RECENT_SEARCHES_KEY) || '[]');
      const list = Array.isArray(current) ? current : [];
      const deduped = list.filter((item) => `${item?.q || ''}|${item?.from || ''}|${item?.to || ''}|${item?.place || ''}|${item?.radius || '10'}` !== key);
      window.localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify([normalized, ...deduped].slice(0, 5)));
    } catch {}
  }

  function navigate(next: { query?: string; from?: string; to?: string; place?: string; radius?: string } = {}, collapse = true) {
    const qv = next.query ?? query, fv = next.from ?? from, tv = next.to ?? to, pv = next.place ?? place, rv = next.radius ?? radius;
    const params = new URLSearchParams();
    if (qv.trim()) params.set('q', qv.trim()); if (category) params.set('category', category); if (fv) params.set('from', fv); if (tv) params.set('to', tv); if (pv.trim()) params.set('place', pv.trim()); if (rv) params.set('radius', rv);
    if (collapse) {
      rememberSearch({ q: qv, from: fv, to: tv || fv, place: pv, radius: rv });
      setCalendarOpen(false); setExpanded(false); window.scrollTo(0, 0);
    }
    router.push(`/${locale}/produkter?${params.toString()}`, { scroll: collapse });
  }
  function handleSubmit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); navigate(); }
  function handleQueryKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key !== 'Enter') return; event.preventDefault(); event.currentTarget.blur();
    setCalendarOpen(true); requestAnimationFrame(() => calendarScrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' }));
  }
  function finishCalendar() {
    setCalendarOpen(false);
    if (from) navigate({ from, to: to || from }, false);
    requestAnimationFrame(() => { placeInputRef.current?.focus(); placeInputRef.current?.select(); });
  }
  function chooseDate(value: string) {
    if (value < today) return;
    if (!from || (from && to)) { setFrom(value); setTo(''); return; }
    if (value < from) { setFrom(value); setTo(''); return; }
    setTo(value);
  }
  function handlePlaceKeyDown(event: KeyboardEvent<HTMLInputElement>) { if (event.key === 'Enter') { event.preventDefault(); navigate(); } }

  const dateLabel = from ? (to ? `${compactDate(from, en)} – ${compactDate(to, en)}` : compactDate(from, en)) : (en ? 'Add dates' : 'Lägg till datum');
  const whatLabel = query || (en ? 'All products' : 'Alla produkter'); const whereLabel = place ? `${place} · ${radius} km` : (en ? 'Add location' : 'Lägg till plats');
  if (!expanded) return <button type="button" className="rentalSearchCompact2" onClick={() => setExpanded(true)} aria-label={en ? 'Edit search' : 'Ändra sökning'}><SearchIcon /><span><b>{whatLabel}</b><small>{dateLabel} · {whereLabel}</small></span><span className="rentalSearchEdit2">☰</span></button>;

  return <form onSubmit={handleSubmit} className={`rentalSearchFlow2 ${calendarOpen ? 'calendarIsOpen' : ''}`}>
    <label className="rentalSearchField2"><span><b>{en ? 'What?' : 'Vad?'}</b><input value={query} onChange={(e) => setQuery(e.target.value)} onKeyDown={handleQueryKeyDown} enterKeyHint="next" placeholder={en ? 'What do you need?' : 'Vad behöver du?'} /></span><SearchIcon /></label>
    <div className="rentalWhenWrap2"><button type="button" className="rentalSearchRow2" onClick={() => setCalendarOpen((v) => !v)}><span><b>{en ? 'When?' : 'När?'}</b><small>{dateLabel}</small></span><span className="rentalPlus2">＋</span></button>
      {calendarOpen && <div className="rentalCalendar2 rentalCalendarOverlay2"><div className="rentalCalendarScroll2" ref={calendarScrollRef}>{months.map((month, monthIndex) => { const monthLabel = new Intl.DateTimeFormat(en ? 'en-GB' : 'sv-SE', { month: 'long', year: 'numeric' }).format(month); const cells = monthCells(month); return <section className="rentalCalendarMonth2" key={`${month.getFullYear()}-${month.getMonth()}`}><strong className="rentalCalendarMonthTitle2">{monthLabel}</strong>{monthIndex === 0 && <div className="rentalWeekdays2">{weekdays.map((d, i) => <span key={`${d}-${i}`}>{d}</span>)}</div>}<div className="rentalCalendarGrid2">{cells.map((date, i) => { if (!date) return <span key={`blank-${monthIndex}-${i}`} />; const value = isoDate(date), disabled = value < today, selectedStart = value === from, selectedEnd = value === to, inRange = Boolean(from && to && value > from && value < to); return <button type="button" key={value} disabled={disabled} className={`${selectedStart || selectedEnd ? 'selected' : ''} ${inRange ? 'inRange' : ''}`} onClick={() => chooseDate(value)}>{date.getDate()}</button>; })}</div></section>; })}</div><div className="rentalCalendarFooter2"><button type="button" className="clear" onClick={() => { setFrom(''); setTo(''); navigate({ from: '', to: '' }, false); }}>{en ? 'Clear' : 'Rensa'}</button><button type="button" className="done" disabled={!from} onClick={finishCalendar}>{en ? 'Done' : 'Klar'}</button></div></div>}
    </div>
    <div className="rentalSearchField2 rentalWhereField2"><span><b>{en ? 'Where?' : 'Var?'}</b><input ref={placeInputRef} value={place} onChange={(e) => setPlace(e.target.value)} onBlur={() => { if (place.trim() !== initialPlace.trim()) navigate({ place }, false); }} onKeyDown={handlePlaceKeyDown} enterKeyHint="search" placeholder={en ? 'City or area' : 'Ort eller område'} /></span><label className="rentalRadiusInline2"><small>{radius} km</small><input aria-label={en ? 'Search radius' : 'Sökradie'} type="range" min="1" max="50" step="1" value={radius} onChange={(e) => setRadius(e.target.value)} onPointerUp={(e) => navigate({ radius: (e.currentTarget as HTMLInputElement).value }, false)} onKeyUp={(e) => { if (['ArrowLeft','ArrowRight','Home','End','PageUp','PageDown'].includes(e.key)) navigate({ radius: e.currentTarget.value }, false); }} /></label></div>
    <button type="submit" className="rentalSearchSubmit2"><SearchIcon />{en ? 'Search' : 'Sök'}</button>
  </form>;
}
