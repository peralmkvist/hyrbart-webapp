'use client';

import { FormEvent, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

type CategoryOption = { value: string; label: string };

type Props = {
  locale: string;
  query?: string;
  from?: string;
  to?: string;
  place?: string;
  nearby?: boolean;
  category?: string;
  radius?: string;
  maxPrice?: string;
  minRating?: string;
  discountOnly?: boolean;
  categories: CategoryOption[];
  resultCount: number;
};

export default function SearchFilters({
  locale,
  query = '',
  from = '',
  to = '',
  place = '',
  nearby = false,
  category = '',
  radius = '10',
  maxPrice = '',
  minRating = '',
  discountOnly = false,
  categories,
  resultCount,
}: Props) {
  const router = useRouter();
  const en = locale === 'en';
  const [open, setOpen] = useState(Boolean(category || maxPrice || minRating || discountOnly || radius !== '10'));
  const [draftCategory, setDraftCategory] = useState(category);
  const [draftRadius, setDraftRadius] = useState(radius || '10');
  const [draftMaxPrice, setDraftMaxPrice] = useState(maxPrice);
  const [draftMinRating, setDraftMinRating] = useState(minRating);
  const [draftDiscountOnly, setDraftDiscountOnly] = useState(discountOnly);

  const activeFilters = useMemo(() => {
    const items: string[] = [];
    if (category) items.push(categories.find(item => item.value === category)?.label || category);
    if (radius !== '10') items.push(`${radius} km`);
    if (maxPrice) items.push(en ? `Max SEK ${maxPrice}` : `Max ${maxPrice} kr`);
    if (minRating) items.push(`★ ${minRating}+`);
    if (discountOnly) items.push(en ? 'Discount' : 'Rabatt');
    return items;
  }, [category, categories, discountOnly, en, maxPrice, minRating, radius]);

  function buildBaseParams() {
    const params = new URLSearchParams();
    if (query.trim()) params.set('q', query.trim());
    if (from) params.set('from', from);
    if (to) params.set('to', to);
    if (place.trim()) params.set('place', place.trim());
    if (nearby) params.set('nearby', '1');
    return params;
  }

  function apply(event?: FormEvent) {
    event?.preventDefault();
    const params = buildBaseParams();
    if (draftCategory) params.set('category', draftCategory);
    if (draftRadius) params.set('radius', draftRadius);
    if (draftMaxPrice && Number(draftMaxPrice) > 0) params.set('maxPrice', String(Math.round(Number(draftMaxPrice))));
    if (draftMinRating) params.set('minRating', draftMinRating);
    if (draftDiscountOnly) params.set('discountOnly', '1');
    router.push(`/${locale}/produkter?${params.toString()}`);
  }

  function clearAll() {
    setDraftCategory('');
    setDraftRadius('10');
    setDraftMaxPrice('');
    setDraftMinRating('');
    setDraftDiscountOnly(false);
    const params = buildBaseParams();
    params.set('radius', '10');
    router.push(`/${locale}/produkter?${params.toString()}`);
  }

  return (
    <section className="searchFilters115" aria-label={en ? 'Search filters' : 'Sökfilter'}>
      <div className="searchFilters115Top">
        <button type="button" className="searchFilters115Toggle" onClick={() => setOpen(value => !value)} aria-expanded={open}>
          <span className="searchFilters115Sliders" aria-hidden="true">☷</span>
          <span>{en ? 'Filters' : 'Filter'}</span>
          {activeFilters.length > 0 ? <b>{activeFilters.length}</b> : null}
        </button>
        <span className="searchFilters115Count">{resultCount} {en ? (resultCount === 1 ? 'result' : 'results') : (resultCount === 1 ? 'träff' : 'träffar')}</span>
      </div>

      {activeFilters.length > 0 ? (
        <div className="searchFilters115Chips" aria-label={en ? 'Active filters' : 'Aktiva filter'}>
          {activeFilters.map(item => <span key={item}>{item}</span>)}
          <button type="button" onClick={clearAll}>{en ? 'Clear all' : 'Rensa alla'}</button>
        </div>
      ) : null}

      {open ? (
        <form className="searchFilters115Panel" onSubmit={apply}>
          <label>
            <span>{en ? 'Category' : 'Kategori'}</span>
            <select value={draftCategory} onChange={event => setDraftCategory(event.target.value)}>
              <option value="">{en ? 'All categories' : 'Alla kategorier'}</option>
              {categories.map(item => <option key={item.value} value={item.value}>{item.label}</option>)}
            </select>
          </label>

          <label>
            <span>{en ? 'Maximum distance' : 'Maxavstånd'}</span>
            <select value={draftRadius} onChange={event => setDraftRadius(event.target.value)}>
              {[2, 5, 10, 25, 50].map(km => <option key={km} value={String(km)}>{km} km</option>)}
            </select>
          </label>

          <label>
            <span>{en ? 'Maximum price' : 'Maxpris'}</span>
            <div className="searchFilters115InputWithUnit">
              <input inputMode="numeric" type="number" min="1" step="1" placeholder={en ? 'No limit' : 'Ingen gräns'} value={draftMaxPrice} onChange={event => setDraftMaxPrice(event.target.value)} />
              <i>kr</i>
            </div>
            <small>{from ? (en ? 'Calculated for the selected rental period.' : 'Beräknas för vald hyresperiod.') : (en ? 'Without dates, the one-day price is used.' : 'Utan datum används priset för en dag.')}</small>
          </label>

          <label>
            <span>{en ? 'Minimum rating' : 'Minsta betyg'}</span>
            <select value={draftMinRating} onChange={event => setDraftMinRating(event.target.value)}>
              <option value="">{en ? 'Any rating' : 'Alla betyg'}</option>
              <option value="4">4,0+</option>
              <option value="4.5">4,5+</option>
            </select>
          </label>

          <label className="searchFilters115Check">
            <input type="checkbox" checked={draftDiscountOnly} onChange={event => setDraftDiscountOnly(event.target.checked)} />
            <span>{en ? 'Only products with an applicable discount' : 'Endast objekt med tillämplig rabatt'}</span>
          </label>

          <div className="searchFilters115Actions">
            <button type="button" onClick={clearAll}>{en ? 'Clear all' : 'Rensa alla'}</button>
            <button type="submit">{en ? 'Show results' : 'Visa resultat'}</button>
          </div>
        </form>
      ) : null}

      <style jsx>{`
        .searchFilters115 { margin: 14px 0 18px; }
        .searchFilters115Top { display:flex; align-items:center; justify-content:space-between; gap:12px; }
        .searchFilters115Toggle { display:inline-flex; align-items:center; gap:8px; min-height:42px; padding:9px 14px; border:1px solid var(--line); border-radius:999px; background:#fff; color:var(--ink); font-weight:800; cursor:pointer; }
        .searchFilters115Toggle b { display:grid; place-items:center; min-width:22px; height:22px; padding:0 6px; border-radius:999px; background:var(--accent); color:#111; font-size:.76rem; }
        .searchFilters115Sliders { font-size:1.05rem; transform:rotate(90deg); display:inline-block; }
        .searchFilters115Count { color:var(--muted); font-size:.9rem; }
        .searchFilters115Chips { display:flex; gap:7px; overflow-x:auto; padding:10px 0 0; scrollbar-width:none; }
        .searchFilters115Chips::-webkit-scrollbar { display:none; }
        .searchFilters115Chips span,.searchFilters115Chips button { flex:0 0 auto; border:0; border-radius:999px; padding:7px 10px; background:#e8e9e5; color:#34393c; font-size:.82rem; }
        .searchFilters115Chips button { background:transparent; text-decoration:underline; cursor:pointer; }
        .searchFilters115Panel { margin-top:12px; padding:16px; border:1px solid var(--line); border-radius:20px; background:#fff; box-shadow:0 8px 24px rgba(0,0,0,.06); display:grid; grid-template-columns:1fr 1fr; gap:14px; }
        .searchFilters115Panel label { display:grid; gap:6px; min-width:0; }
        .searchFilters115Panel label > span { font-weight:800; font-size:.9rem; }
        .searchFilters115Panel select,.searchFilters115Panel input[type='number'] { width:100%; min-height:44px; border:1px solid var(--line); border-radius:12px; background:#f8f8f6; padding:0 12px; color:var(--ink); font:inherit; }
        .searchFilters115Panel small { color:var(--muted); line-height:1.3; }
        .searchFilters115InputWithUnit { position:relative; }
        .searchFilters115InputWithUnit input { padding-right:42px !important; }
        .searchFilters115InputWithUnit i { position:absolute; right:12px; top:50%; transform:translateY(-50%); color:var(--muted); font-style:normal; }
        .searchFilters115Check { grid-column:1 / -1; display:flex !important; grid-template-columns:none !important; align-items:center; gap:10px !important; min-height:42px; }
        .searchFilters115Check input { width:20px; height:20px; accent-color:#15191b; }
        .searchFilters115Check span { font-weight:650 !important; }
        .searchFilters115Actions { grid-column:1 / -1; display:flex; justify-content:flex-end; gap:8px; padding-top:2px; }
        .searchFilters115Actions button { min-height:43px; padding:0 15px; border-radius:12px; border:1px solid var(--line); background:#fff; font-weight:800; cursor:pointer; }
        .searchFilters115Actions button:last-child { border-color:var(--accent); background:var(--accent); color:#111; }
        @media (max-width:560px) { .searchFilters115Panel { grid-template-columns:1fr; } .searchFilters115Check,.searchFilters115Actions { grid-column:auto; } .searchFilters115Actions { justify-content:stretch; } .searchFilters115Actions button { flex:1; } }
      `}</style>
    </section>
  );
}
