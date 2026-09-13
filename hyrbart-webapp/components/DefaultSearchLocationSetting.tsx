'use client';

import { useEffect, useState } from 'react';

type Suggestion = { label: string; lat: number; lng: number; type: string };
const STORAGE_KEY = 'hyrbartDefaultSearchLocation';
const COOKIE_KEY = 'hyrbartDefaultSearchLocation';

export default function DefaultSearchLocationSetting({ locale }: { locale: string }) {
  const en = locale === 'en';
  const [place, setPlace] = useState('');
  const [radius, setRadius] = useState('10');
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      const parsed = raw ? JSON.parse(raw) as { place?: string; radius?: string } : null;
      if (parsed?.place) setPlace(parsed.place);
      if (parsed?.radius) setRadius(parsed.radius);
    } catch {}
  }, []);

  useEffect(() => {
    const query = place.trim();
    if (query.length < 2 || saved) { setSuggestions([]); return; }
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      try {
        const response = await fetch(`/api/location-search?q=${encodeURIComponent(query)}`, { signal: controller.signal });
        const data = await response.json() as { results?: Suggestion[] };
        setSuggestions(data.results ?? []);
      } catch {}
    }, 250);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [place, saved]);

  function save() {
    const value = { place: place.trim(), radius };
    if (!value.place) return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
    document.cookie = `${COOKIE_KEY}=${encodeURIComponent(JSON.stringify(value))}; Path=/; Max-Age=31536000; SameSite=Lax`;
    setSuggestions([]);
    setSaved(true);
  }

  function clear() {
    window.localStorage.removeItem(STORAGE_KEY);
    document.cookie = `${COOKIE_KEY}=; Path=/; Max-Age=0; SameSite=Lax`;
    setPlace('');
    setRadius('10');
    setSuggestions([]);
    setSaved(false);
  }

  return <div className="profileSettingsForm">
    <label><span>{en ? 'Place' : 'Plats'}</span><input value={place} onChange={event => { setPlace(event.target.value); setSaved(false); }} autoComplete="street-address" placeholder={en ? 'Search a place' : 'Sök plats'} /></label>
    {suggestions.length > 0 ? <div className="profileLocationSuggestions">
      {suggestions.slice(0, 5).map(item => <button type="button" key={`${item.lat}-${item.lng}`} onClick={() => { setPlace(item.label); setSuggestions([]); setSaved(false); }}>{item.label}</button>)}
    </div> : null}
    <label><span>{en ? `Search radius: ${radius} km` : `Sökradie: ${radius} km`}</span><input className="profileRangeInput" type="range" min="1" max="50" step="1" value={radius} onChange={event => { setRadius(event.target.value); setSaved(false); }} /></label>
    <button type="button" className="profilePrimaryAction" onClick={save} disabled={!place.trim()}>{saved ? (en ? 'Saved' : 'Sparat') : (en ? 'Save default location' : 'Spara standardplats')}</button>
    <button type="button" className="profileSecondaryAction" onClick={clear}>{en ? 'Remove default location' : 'Ta bort standardplats'}</button>
  </div>;
}
