'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { SearchIcon } from './Icons';

export default function ProductSearchForm({ locale, initialQuery = '', category }: { locale: string; initialQuery?: string; category?: string }) {
  const router = useRouter();
  const en = locale === 'en';
  const [open, setOpen] = useState<'what' | 'when' | 'where' | null>(null);
  const [query, setQuery] = useState(initialQuery);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [place, setPlace] = useState('Danderyd');
  const [radius, setRadius] = useState('10');

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const params = new URLSearchParams();
    if (query.trim()) params.set('q', query.trim());
    if (category) params.set('category', category);
    if (from) params.set('from', from);
    if (to) params.set('to', to);
    if (place.trim()) params.set('place', place.trim());
    if (radius) params.set('radius', radius);
    setOpen(null);
    window.scrollTo(0, 0);
    router.push(`/${locale}/produkter?${params.toString()}`, { scroll: true });
  }

  const dateLabel = from && to ? `${from.slice(5).replace('-', '/')} – ${to.slice(5).replace('-', '/')}` : (en ? 'Add dates' : 'Lägg till datum');

  return (
    <form onSubmit={handleSubmit} className="rentalSearchFlow2">
      <button type="button" className="rentalSearchRow2" onClick={() => setOpen(open === 'what' ? null : 'what')}>
        <span><b>{en ? 'What' : 'Vad'}</b><small>{query || (en ? 'What do you need?' : 'Vad behöver du?')}</small></span><SearchIcon />
      </button>
      {open === 'what' && <div className="rentalSearchPanel2"><label>{en ? 'What do you want to rent?' : 'Vad vill du hyra?'}</label><div className="rentalPanelInput2"><SearchIcon /><input autoFocus value={query} onChange={(e) => setQuery(e.target.value)} placeholder={en ? 'Search products or categories' : 'Sök produkt eller kategori'} /></div></div>}

      <button type="button" className="rentalSearchRow2" onClick={() => setOpen(open === 'when' ? null : 'when')}>
        <span><b>{en ? 'When' : 'När'}</b><small>{dateLabel}</small></span><span className="rentalPlus2">＋</span>
      </button>
      {open === 'when' && <div className="rentalSearchPanel2"><label>{en ? 'When do you need it?' : 'När behöver du den?'}</label><div className="rentalDateGrid2"><span><small>{en ? 'Pick up' : 'Hämta'}</small><input type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></span><span><small>{en ? 'Return' : 'Lämna tillbaka'}</small><input type="date" min={from} value={to} onChange={(e) => setTo(e.target.value)} /></span></div></div>}

      <button type="button" className="rentalSearchRow2" onClick={() => setOpen(open === 'where' ? null : 'where')}>
        <span><b>{en ? 'Where' : 'Var'}</b><small>{place ? `${place} · ${radius} km` : (en ? 'Add location' : 'Lägg till plats')}</small></span><span className="rentalPlus2">＋</span>
      </button>
      {open === 'where' && <div className="rentalSearchPanel2"><label>{en ? 'Where do you want to search?' : 'Var vill du söka?'}</label><input className="rentalLocationInput2" value={place} onChange={(e) => setPlace(e.target.value)} placeholder={en ? 'City or area' : 'Ort eller område'} /><div className="rentalRadius2"><span>{en ? 'Search radius' : 'Sökradie'}</span><b>{radius} km</b><input type="range" min="1" max="50" step="1" value={radius} onChange={(e) => setRadius(e.target.value)} /></div></div>}

      <button type="submit" className="rentalSearchSubmit2"><SearchIcon />{en ? 'Search' : 'Sök'}</button>
    </form>
  );
}
