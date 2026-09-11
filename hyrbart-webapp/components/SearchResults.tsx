'use client';

import Link from 'next/link';
import { useMemo, useRef, useState } from 'react';
import ProductVisual from './ProductVisual';

type ResultItem = {
  slug: string;
  href: string;
  brand: string;
  name: string;
  type: string;
  image?: string;
  accent?: string;
  priceLabel: string;
  mapLabel: string;
};

function zoomForRadius(radius: number) {
  if (radius <= 3) return 14;
  if (radius <= 7) return 13;
  if (radius <= 15) return 12;
  if (radius <= 30) return 11;
  return 10;
}

export default function SearchResults({
  locale,
  place,
  radius,
  items,
  metaLabel,
  clearHref,
}: {
  locale: string;
  place: string;
  radius: number;
  items: ResultItem[];
  metaLabel: string;
  clearHref: string;
}) {
  const en = locale === 'en';
  const [activeSlug, setActiveSlug] = useState<string | null>(items[0]?.slug ?? null);
  const cardRefs = useRef<Record<string, HTMLAnchorElement | null>>({});
  const zoom = zoomForRadius(radius);
  const query = encodeURIComponent(`${place}, Sweden`);
  const mapSrc = useMemo(
    () => `https://www.google.com/maps?q=${query}&z=${zoom}&output=embed&hl=${en ? 'en' : 'sv'}`,
    [query, zoom, en],
  );

  function chooseMarker(slug: string) {
    setActiveSlug(slug);
    requestAnimationFrame(() => {
      cardRefs.current[slug]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
  }

  return (
    <>
      <section className="resultsMap2" aria-label={en ? 'Map of search results' : 'Karta över sökresultat'}>
        <iframe
          className="resultsMapFrame2"
          title={en ? `Map around ${place}` : `Karta runt ${place}`}
          src={mapSrc}
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
        />
        {items.slice(0, 5).map((item, index) => (
          <button
            type="button"
            key={item.slug}
            className={`mapPrice2 m${index + 1}${activeSlug === item.slug ? ' active' : ''}`}
            onClick={() => chooseMarker(item.slug)}
            aria-label={en ? `Show ${item.brand} ${item.name}` : `Visa ${item.brand} ${item.name}`}
          >
            {item.mapLabel}
          </button>
        ))}
        <span className="mapAreaNotice2">{en ? 'Approximate area' : 'Ungefärligt område'}</span>
      </section>

      <div className="rentMeta2 searchResultsMeta2">
        <span>{metaLabel}</span>
        <Link href={clearHref}>{en ? 'Clear filters' : 'Rensa filter'}</Link>
      </div>

      <section className="productGrid2">
        {items.map((item) => (
          <Link
            ref={(node) => { cardRefs.current[item.slug] = node; }}
            href={item.href}
            className={`productTile2 searchResultTile2${activeSlug === item.slug ? ' active' : ''}`}
            key={item.slug}
            onFocus={() => setActiveSlug(item.slug)}
            onMouseEnter={() => setActiveSlug(item.slug)}
            onTouchStart={() => setActiveSlug(item.slug)}
          >
            <div className="productTileVisual2">
              <ProductVisual kind="cleaner" accent={item.accent} imageSrc={item.image} imageAlt={`${item.brand} ${item.name}`} />
            </div>
            <div className="productTileCopy2">
              <strong>{item.brand} {item.name}</strong>
              <span>{item.type}</span>
              <b>{item.priceLabel}</b>
            </div>
          </Link>
        ))}
      </section>
    </>
  );
}
