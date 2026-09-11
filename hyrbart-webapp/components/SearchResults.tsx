'use client';

import Link from 'next/link';
import { useMemo, useRef, useState } from 'react';
import ProductVisual from './ProductVisual';

type GeoPoint = { lat: number; lng: number };
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
  lat?: number;
  lng?: number;
  distanceKm?: number;
};

function zoomForRadius(radius: number) {
  if (radius <= 3) return 14;
  if (radius <= 7) return 13;
  if (radius <= 15) return 12;
  if (radius <= 30) return 11;
  return 10;
}

function markerPosition(point: GeoPoint, center: GeoPoint, radius: number) {
  const kmPerLat = 111.32;
  const kmPerLng = 111.32 * Math.cos((center.lat * Math.PI) / 180);
  const eastKm = (point.lng - center.lng) * kmPerLng;
  const northKm = (point.lat - center.lat) * kmPerLat;
  const halfWidthKm = Math.max(radius * 1.1, 1);
  const halfHeightKm = Math.max(radius * 0.72, .75);
  const left = Math.max(8, Math.min(92, 50 + (eastKm / halfWidthKm) * 50));
  const top = Math.max(10, Math.min(88, 50 - (northKm / halfHeightKm) * 50));
  return { left: `${left}%`, top: `${top}%` };
}

export default function SearchResults({
  locale,
  place,
  radius,
  center,
  items,
  metaLabel,
  clearHref,
}: {
  locale: string;
  place: string;
  radius: number;
  center: GeoPoint;
  items: ResultItem[];
  metaLabel: string;
  clearHref: string;
}) {
  const en = locale === 'en';
  const [activeSlug, setActiveSlug] = useState<string | null>(items[0]?.slug ?? null);
  const cardRefs = useRef<Record<string, HTMLAnchorElement | null>>({});
  const zoom = zoomForRadius(radius);
  const query = encodeURIComponent(`${center.lat},${center.lng}`);
  const mapSrc = useMemo(
    () => `https://www.google.com/maps?q=${query}&z=${zoom}&output=embed&hl=${en ? 'en' : 'sv'}`,
    [query, zoom, en],
  );

  const markerGroups = useMemo(() => {
    const groups = new Map<string, ResultItem[]>();
    items.forEach((item) => {
      if (item.lat == null || item.lng == null) return;
      const key = `${item.lat.toFixed(5)},${item.lng.toFixed(5)}`;
      const group = groups.get(key) ?? [];
      group.push(item);
      groups.set(key, group);
    });
    return Array.from(groups.values());
  }, [items]);

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
        {markerGroups.map((group) => {
          const first = group[0];
          const point = { lat: first.lat!, lng: first.lng! };
          const active = group.some((item) => item.slug === activeSlug);
          return (
            <button
              type="button"
              key={`${first.lat}-${first.lng}`}
              className={`mapPrice2${active ? ' active' : ''}`}
              style={markerPosition(point, center, radius)}
              onClick={() => chooseMarker(first.slug)}
              aria-label={group.length > 1
                ? (en ? `Show ${group.length} listings at this location` : `Visa ${group.length} annonser på platsen`)
                : (en ? `Show ${first.brand} ${first.name}` : `Visa ${first.brand} ${first.name}`)}
            >
              {first.mapLabel}{group.length > 1 ? ` · ${group.length}` : ''}
            </button>
          );
        })}
        <span className="mapAreaNotice2">{radius} km · {place}</span>
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
              {item.distanceKm != null ? <span className="productDistance2">{item.distanceKm < .1 ? (en ? '< 0.1 km away' : '< 0,1 km bort') : `${item.distanceKm.toLocaleString(en ? 'en-GB' : 'sv-SE', { maximumFractionDigits: 1 })} km ${en ? 'away' : 'bort'}`}</span> : null}
              <b>{item.priceLabel}</b>
            </div>
          </Link>
        ))}
      </section>
    </>
  );
}
