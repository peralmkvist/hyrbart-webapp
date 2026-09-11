'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';

type ProductCard = {
  slug: string;
  brand: string;
  name: string;
  type: string;
  typeEn?: string;
  price: string;
  image?: string;
  accent?: string;
};

type RecentSearch = {
  q?: string;
  from?: string;
  to?: string;
  place?: string;
  radius?: string;
  ts?: number;
};

const STORAGE_KEY = 'hyrbartRecentSearches';

function compactDate(value: string, en: boolean) {
  if (!value) return '';
  return new Intl.DateTimeFormat(en ? 'en-GB' : 'sv-SE', { day: 'numeric', month: 'short' }).format(new Date(`${value}T12:00:00`));
}

function hrefFor(locale: string, search: RecentSearch) {
  const params = new URLSearchParams();
  if (search.q) params.set('q', search.q);
  if (search.from) params.set('from', search.from);
  if (search.to) params.set('to', search.to);
  if (search.place) params.set('place', search.place);
  if (search.radius) params.set('radius', search.radius);
  return `/${locale}/produkter?${params.toString()}`;
}

export default function RecentSearchRail({ locale, products }: { locale: string; products: ProductCard[] }) {
  const en = locale === 'en';
  const [recent, setRecent] = useState<RecentSearch[]>([]);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      if (Array.isArray(parsed)) setRecent(parsed.slice(0, 5));
    } catch {
      setRecent([]);
    }
  }, []);

  const cards = useMemo(() => {
    const placeholders = products.slice(0, 5).map((p) => ({
      search: { q: p.type, place: 'Danderyd', radius: '10' } as RecentSearch,
      product: p,
    }));
    const actual = recent.slice(0, 5).map((search, index) => {
      const q = (search.q || '').toLocaleLowerCase('sv');
      const product = products.find((p) => `${p.brand} ${p.name} ${p.type} ${p.typeEn ?? ''}`.toLocaleLowerCase('sv').includes(q)) || products[index % Math.max(products.length, 1)];
      return { search, product };
    });
    return [...actual, ...placeholders.slice(actual.length)].slice(0, 5);
  }, [recent, products]);

  return (
    <section className="homePopular2 homeSearchHistory2">
      <div className="sectionHeading2"><h2>{en ? 'Your recent searches' : 'Dina senaste sökningar'}</h2></div>
      <div className="popularRail2">
        {cards.map(({ search, product }, index) => {
          if (!product) return null;
          const title = search.q || (en ? (product.typeEn ?? product.type) : product.type);
          const date = search.from ? (search.to && search.to !== search.from ? `${compactDate(search.from, en)} – ${compactDate(search.to, en)}` : compactDate(search.from, en)) : '';
          const place = search.place || 'Danderyd';
          const radius = search.radius || '10';
          const subtitle = [date, `${place} · ${radius} km`].filter(Boolean).join(' · ');
          return (
            <Link
              key={`${title}-${index}`}
              href={hrefFor(locale, search)}
              className="recentSearchCard2"
              style={{
                flex: '0 0 auto',
                minWidth: 156,
                maxWidth: 220,
                padding: '11px 13px',
                borderRadius: 14,
                background: '#f0f0ee',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                gap: 3,
              }}
            >
              <strong style={{fontSize: '.9rem', lineHeight: 1.15}}>{title}</strong>
              <span style={{fontSize: '.75rem', lineHeight: 1.25, color: 'var(--muted)'}}>{subtitle}</span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
