'use client';

import { FormEvent, KeyboardEvent, useEffect, useMemo, useRef, useState } from 'react';
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
  initialNearby?: boolean;
  initiallyCollapsed?: boolean;
};

type ProductSuggestion = { label: string; kind: 'type' | 'product' | 'category' };
type LocationSuggestion = { label: string; lat: number; lng: number; type: string };
type RecentSearch = { q?: string; from?: string; to?: string; place?: string; radius?: string; nearby?: boolean; ts?: number };
type ActiveStep = 'what' | 'when' | 'where' | null;

const RECENT_SEARCHES_KEY = 'hyrbartRecentSearches';

function compactDate(value: string, en: boolean) {
  if (!value) return '';
  return new Intl.DateTimeFormat(en ? 'en-GB' : 'sv-SE', { day: 'numeric', month: 'short' }).format(new Date(`${value}T12:00:00`));
}

function isoDate(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function monthCells(cursor: Date) {
  const y = cursor.getFullYear();
  const m = cursor.getMonth();
  const first = new Date(y, m, 1);
  const offset = (first.getDay() + 6) % 7;
  const days = new Date(y, m + 1, 0).getDate();
  return Array.from({ length: offset + days }, (_, i) => {
    const day = i - offset + 1;
    return day >= 1 && day <= days ? new Date(y, m, day) : null;
  });
}

function BackIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 18l-6-6 6-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}

function LocationIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21s6-5.1 6-11a6 6 0 1 0-12 0c0 5.9 6 11 6 11Z" fill="none" stroke="currentColor" strokeWidth="1.8" /><circle cx="12" cy="10" r="2.1" fill="currentColor" /></svg>;
}

export default function ProductSearchForm({
  locale,
  initialQuery = '',
  category,
  initialFrom = '',
  initialTo = '',
  initialPlace = '',
  initialRadius = '10',
  initialNearby = false,
  initiallyCollapsed = false,
}: Props) {
  const router = useRouter();
  const en = locale === 'en';
  const formRef = useRef<HTMLFormElement>(null);
  const queryInputRef = useRef<HTMLInputElement>(null);
  const placeInputRef = useRef<HTMLInputElement>(null);
  const calendarScrollRef = useRef<HTMLDivElement>(null);

  const [expanded, setExpanded] = useState(!initiallyCollapsed);
  const [activeStep, setActiveStep] = useState<ActiveStep>(null);
  const [query, setQuery] = useState(initialQuery);
  const [from, setFrom] = useState(initialFrom);
  const [to, setTo] = useState(initialTo);
  const [place, setPlace] = useState(initialPlace);
  const [nearbySelected, setNearbySelected] = useState(initialNearby);
  const [radius, setRadius] = useState(initialRadius);
  const [searchStarted, setSearchStarted] = useState(Boolean(initialQuery.trim() || initialFrom || initialTo || initialPlace || initiallyCollapsed));
  const [recentSearches, setRecentSearches] = useState<RecentSearch[]>([]);
  const [productSuggestions, setProductSuggestions] = useState<ProductSuggestion[]>([]);
  const [showProductSuggestions, setShowProductSuggestions] = useState(false);
  const [locationSuggestions, setLocationSuggestions] = useState<LocationSuggestion[]>([]);
  const [showLocationSuggestions, setShowLocationSuggestions] = useState(false);
  const [locating, setLocating] = useState(false);

  useEffect(() => {
    try {
      const parsed = JSON.parse(window.localStorage.getItem(RECENT_SEARCHES_KEY) || '[]');
      if (Array.isArray(parsed)) setRecentSearches(parsed.slice(0, 5));
    } catch {
      setRecentSearches([]);
    }
  }, []);

  useEffect(() => {
    if (!searchStarted) return;
    function outside(event: PointerEvent) {
      if (formRef.current && !formRef.current.contains(event.target as Node)) {
        setActiveStep(null);
        setShowProductSuggestions(false);
        setShowLocationSuggestions(false);
      }
    }
    document.addEventListener('pointerdown', outside);
    return () => document.removeEventListener('pointerdown', outside);
  }, [searchStarted]);

  useEffect(() => {
    const q = query.trim();
    if (!q) {
      setProductSuggestions([]);
      return;
    }
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      try {
        const response = await fetch(`/api/product-suggestions?q=${encodeURIComponent(q)}`, { signal: controller.signal });
        const data = await response.json() as { results?: ProductSuggestion[] };
        setProductSuggestions(data.results ?? []);
      } catch {}
    }, 180);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [query]);

  useEffect(() => {
    if (nearbySelected) {
      setLocationSuggestions([]);
      return;
    }
    const q = place.trim();
    if (q.length < 2) {
      setLocationSuggestions([]);
      return;
    }
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      try {
        const response = await fetch(`/api/location-search?q=${encodeURIComponent(q)}`, { signal: controller.signal });
        const data = await response.json() as { results?: LocationSuggestion[] };
        setLocationSuggestions(data.results ?? []);
      } catch {}
    }, 260);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [place, nearbySelected]);

  const today = isoDate(new Date());
  const baseMonth = useMemo(() => {
    const source = initialFrom ? new Date(`${initialFrom}T12:00:00`) : new Date();
    return new Date(source.getFullYear(), source.getMonth(), 1);
  }, [initialFrom]);
  const months = useMemo(() => Array.from({ length: 12 }, (_, i) => new Date(baseMonth.getFullYear(), baseMonth.getMonth() + i, 1)), [baseMonth]);
  const weekdays = en ? ['M', 'T', 'W', 'T', 'F', 'S', 'S'] : ['M', 'T', 'O', 'T', 'F', 'L', 'S'];
  const hasActiveFilters = Boolean(query || from || to || category || place || radius !== '10');
  const nearbyLabel = en ? 'Nearby' : 'I närheten';

  function rememberSearch(search: RecentSearch) {
    try {
      const normalized = {
        q: search.q?.trim() || '',
        from: search.from || '',
        to: search.to || '',
        place: search.place?.trim() || '',
        radius: search.radius || '10',
        nearby: Boolean(search.nearby),
        ts: Date.now(),
      };
      const key = `${normalized.q}|${normalized.from}|${normalized.to}|${normalized.place}|${normalized.radius}|${normalized.nearby ? 1 : 0}`;
      const parsed = JSON.parse(window.localStorage.getItem(RECENT_SEARCHES_KEY) || '[]');
      const list = Array.isArray(parsed) ? parsed : [];
      const next = [normalized, ...list.filter(item => `${item?.q || ''}|${item?.from || ''}|${item?.to || ''}|${item?.place || ''}|${item?.radius || '10'}|${item?.nearby ? 1 : 0}` !== key)].slice(0, 5);
      window.localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(next));
      setRecentSearches(next);
    } catch {}
  }

  function navigate(next: { query?: string; from?: string; to?: string; place?: string; radius?: string; nearby?: boolean } = {}, collapse = true) {
    const qv = next.query ?? query;
    const fv = next.from ?? from;
    const tv = next.to ?? to;
    const pv = next.place ?? place;
    const rv = next.radius ?? radius;
    const nv = next.nearby ?? nearbySelected;
    const params = new URLSearchParams();
    if (qv.trim()) params.set('q', qv.trim());
    if (category) params.set('category', category);
    if (fv) params.set('from', fv);
    if (tv) params.set('to', tv);
    if (pv.trim()) params.set('place', pv.trim());
    if (rv) params.set('radius', rv);
    if (nv) params.set('nearby', '1');
    if (collapse) {
      rememberSearch({ q: qv, from: fv, to: tv || fv, place: pv, radius: rv, nearby: nv });
      setActiveStep(null);
      setExpanded(false);
      window.scrollTo(0, 0);
    }
    router.push(`/${locale}/produkter?${params.toString()}`, { scroll: collapse });
  }

  function resetSearch() {
    setQuery('');
    setFrom('');
    setTo('');
    setPlace('');
    setNearbySelected(false);
    setRadius('10');
    setActiveStep(null);
    setShowProductSuggestions(false);
    setShowLocationSuggestions(false);
    setExpanded(true);
    setSearchStarted(false);
    (document.activeElement as HTMLElement | null)?.blur();
    queryInputRef.current?.blur();
    placeInputRef.current?.blur();
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    window.setTimeout(() => {
      router.replace(`/${locale}`, { scroll: true });
      window.requestAnimationFrame(() => window.scrollTo({ top: 0, left: 0, behavior: 'auto' }));
    }, 180);
  }

  function closeWhat() {
    setActiveStep(null);
    setShowProductSuggestions(false);
    queryInputRef.current?.blur();
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (searchStarted) navigate();
  }

  function activateWhat() {
    setSearchStarted(true);
    setActiveStep('what');
    setShowProductSuggestions(true);
    setShowLocationSuggestions(false);
  }

  function openCalendar() {
    setSearchStarted(true);
    setActiveStep('when');
    setShowProductSuggestions(false);
    setShowLocationSuggestions(false);
    requestAnimationFrame(() => calendarScrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' }));
  }

  function openWhere() {
    setSearchStarted(true);
    setActiveStep('where');
    setShowProductSuggestions(false);
    setShowLocationSuggestions(true);
    requestAnimationFrame(() => placeInputRef.current?.focus());
  }

  function queryKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Enter') {
      event.preventDefault();
      event.currentTarget.blur();
      openCalendar();
    }
  }

  function pickProduct(label: string) {
    setQuery(label);
    openCalendar();
  }

  function pickRecent(item: RecentSearch) {
    setQuery(item.q || '');
    setFrom(item.from || '');
    setTo(item.to || '');
    setPlace(item.place || '');
    setNearbySelected(Boolean(item.nearby));
    setRadius(item.radius || '10');
    openCalendar();
  }

  function nextFromCalendar() {
    if (!from) return;
    if (!to) setTo(from);
    openWhere();
  }

  function chooseDate(value: string) {
    if (value < today) return;
    if (!from || to) {
      setFrom(value);
      setTo('');
    } else if (value < from) {
      setFrom(value);
      setTo('');
    } else {
      setTo(value);
    }
  }

  function placeKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Enter') {
      event.preventDefault();
      setShowLocationSuggestions(false);
      navigate();
    }
  }

  function useCurrentLocation() {
    if (!navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(async position => {
      try {
        const response = await fetch(`/api/reverse-geocode?lat=${position.coords.latitude}&lng=${position.coords.longitude}`);
        const data = await response.json() as { label?: string };
        if (data.label) {
          setPlace(data.label);
          setNearbySelected(true);
          setShowLocationSuggestions(false);
        }
      } finally {
        setLocating(false);
      }
    }, () => setLocating(false), { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 });
  }

  const dateLabel = from ? (to ? `${compactDate(from, en)} – ${compactDate(to, en)}` : compactDate(from, en)) : (en ? 'When do you need it?' : 'När behöver du det?');
  const whatLabel = query || (en ? 'All products' : 'Alla produkter');
  const visiblePlace = nearbySelected ? nearbyLabel : place;
  const whereLabel = visiblePlace ? `${visiblePlace} · ${radius} km` : (en ? 'Where do you need it?' : 'Var behöver du det?');
  const recentMeta = (item: RecentSearch) => [
    item.from ? (item.to && item.to !== item.from ? `${compactDate(item.from, en)} – ${compactDate(item.to, en)}` : compactDate(item.from, en)) : '',
    item.nearby ? nearbyLabel : item.place,
  ].filter(Boolean).join(' · ');

  if (!expanded) {
    return <button type="button" className="rentalSearchCompact2" onClick={() => { setExpanded(true); setSearchStarted(true); }} aria-label={en ? 'Edit search' : 'Ändra sökning'}><SearchIcon /><span><b>{whatLabel}</b><small>{dateLabel} · {whereLabel}</small></span><span className="rentalSearchEdit2">☰</span></button>;
  }

  return <form ref={formRef} onSubmit={handleSubmit} className={`rentalSearchFlow2 ${activeStep === 'when' ? 'calendarIsOpen' : ''}`}>
    <div className={`rentalSearchSection2 whatSection2 ${activeStep === 'what' ? 'active' : ''}`}>
      <label className="rentalSearchField2 rentalWhatField2">
        <button type="button" className="rentalLeadingIcon2" onPointerDown={event => event.preventDefault()} onClick={() => activeStep === 'what' ? closeWhat() : activateWhat()} aria-label={activeStep === 'what' ? (en ? 'Back' : 'Tillbaka') : (en ? 'Search' : 'Sök')}>{activeStep === 'what' ? <BackIcon /> : <SearchIcon />}</button>
        <span>{activeStep === 'what' && <b>{en ? 'What' : 'Vad'}</b>}<input ref={queryInputRef} value={query} onFocus={activateWhat} onChange={e => { setQuery(e.target.value); setShowProductSuggestions(true); }} onKeyDown={queryKeyDown} enterKeyHint="next" autoComplete="off" placeholder={activeStep === 'what' ? (en ? 'Search rental items' : 'Sök hyresobjekt') : (en ? 'Start your search' : 'Påbörja din sökning')} /></span>
      </label>
      {activeStep === 'what' && showProductSuggestions && <div className="searchSuggestMenu2 whatSuggestMenu2" role="listbox">
        {query.trim() && productSuggestions.map(item => <button type="button" className="searchSuggestItem2" key={`${item.kind}-${item.label}`} onPointerDown={e => e.preventDefault()} onClick={() => pickProduct(item.label)}><span>{item.label}</span><small>{item.kind === 'product' ? (en ? 'product' : 'produkt') : item.kind === 'category' ? (en ? 'category' : 'kategori') : (en ? 'type' : 'typ')}</small></button>)}
        {!query.trim() && recentSearches.length > 0 && <><div className="searchSuggestHeading2">{en ? 'Recent searches' : 'Senaste sökningar'}</div>{recentSearches.map((item, index) => <button type="button" className="searchSuggestItem2 recentSuggestItem2" key={`${item.ts || index}-${item.q || ''}`} onPointerDown={e => e.preventDefault()} onClick={() => pickRecent(item)}><span><b>{item.q || (en ? 'All products' : 'Alla produkter')}</b>{recentMeta(item) && <small>{recentMeta(item)}</small>}</span><SearchIcon /></button>)}</>}
      </div>}
    </div>

    {searchStarted && <>
      <div className="rentalWhenWrap2">
        <button type="button" className={`rentalSearchRow2 ${activeStep === 'when' ? 'active' : ''}`} onClick={openCalendar}><span><b>{en ? 'When' : 'När'}</b><small>{dateLabel}</small></span><span className="rentalPlus2">＋</span></button>
        {activeStep === 'when' && <div className="rentalCalendar2 rentalCalendarOverlay2">
          <div className="rentalCalendarScroll2" ref={calendarScrollRef}>{months.map((month, monthIndex) => {
            const label = new Intl.DateTimeFormat(en ? 'en-GB' : 'sv-SE', { month: 'long', year: 'numeric' }).format(month);
            const cells = monthCells(month);
            return <section className="rentalCalendarMonth2" key={`${month.getFullYear()}-${month.getMonth()}`}>
              <strong className="rentalCalendarMonthTitle2">{label}</strong>
              {monthIndex === 0 && <div className="rentalWeekdays2">{weekdays.map((d, i) => <span key={`${d}-${i}`}>{d}</span>)}</div>}
              <div className="rentalCalendarGrid2">{cells.map((date, i) => {
                if (!date) return <span key={`blank-${monthIndex}-${i}`} />;
                const value = isoDate(date);
                const disabled = value < today;
                const start = value === from;
                const end = value === to;
                const hasRange = Boolean(from && to && from !== to);
                const inRange = Boolean(from && to && value > from && value < to);
                const classes = [start || end ? 'selected' : '', inRange ? 'inRange' : '', start && hasRange ? 'rangeStart' : '', end && hasRange ? 'rangeEnd' : ''].filter(Boolean).join(' ');
                return <button type="button" key={value} disabled={disabled} className={classes} onClick={() => chooseDate(value)}>{date.getDate()}</button>;
              })}</div>
            </section>;
          })}</div>
          <div className="rentalCalendarFooter2"><button type="button" className="clear" onClick={() => { setFrom(''); setTo(''); }}>{en ? 'Clear' : 'Rensa'}</button><button type="button" className="done" disabled={!from} onClick={nextFromCalendar}>{en ? 'Next' : 'Nästa'}</button></div>
        </div>}
      </div>

      <div className="rentalWhereWrap2">
        <label className={`rentalSearchField2 rentalWhereField2 ${activeStep === 'where' ? 'active' : ''}`}>
          <span><b>{en ? 'Where' : 'Var'}</b><input ref={placeInputRef} value={visiblePlace} onFocus={openWhere} onChange={e => { setNearbySelected(false); setPlace(e.target.value); setShowLocationSuggestions(true); }} onKeyDown={placeKeyDown} enterKeyHint="search" autoComplete="street-address" placeholder={en ? 'Search a place' : 'Sök plats'} /></span>
          <span className="rentalRadiusInline2"><small>{radius} km</small><input aria-label={en ? 'Search radius' : 'Sökradie'} type="range" min="1" max="50" step="1" value={radius} onChange={e => setRadius(e.target.value)} /></span>
        </label>
        {activeStep === 'where' && showLocationSuggestions && <div className="searchSuggestMenu2 locationSuggestMenu2" role="listbox">
          <button type="button" className="searchSuggestItem2 nearbySuggestItem2" disabled={locating} onPointerDown={e => e.preventDefault()} onClick={useCurrentLocation}><span className="locationSuggestIcon2"><LocationIcon /></span><span><b>{locating ? (en ? 'Locating…' : 'Hämtar position…') : nearbyLabel}</b><small>{en ? 'Find everything available nearby' : 'Hitta allt som finns i närheten'}</small></span></button>
          {locationSuggestions.map(item => <button type="button" className="searchSuggestItem2" key={`${item.lat}-${item.lng}`} onPointerDown={e => e.preventDefault()} onClick={() => { setNearbySelected(false); setPlace(item.label); setShowLocationSuggestions(false); }}><span>{item.label}</span></button>)}
        </div>}
      </div>

      <div className="rentalSearchActions2">{hasActiveFilters && <button type="button" className="rentalSearchReset2" onClick={resetSearch}>{en ? 'Clear filters' : 'Rensa filter'}</button>}<button type="submit" className="rentalSearchSubmit2"><SearchIcon />{en ? 'Search' : 'Sök'}</button></div>
    </>}
  </form>;
}
