'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import ProductVisual from './ProductVisual';
import { ProductBadgeLabel } from './ProductPricing';

type GeoPoint = { lat: number; lng: number };
type ResultItem = {
  slug: string;
  href: string;
  brand: string;
  name: string;
  type: string;
  image?: string;
  accent?: string;
  badge?: 'popular' | 'very-popular';
  priceLabel: string;
  mapLabel: string;
  lat?: number;
  lng?: number;
  distanceKm?: number;
  rating?: number | null;
  reviewCount?: number;
};
type LeafletLike = {
  map: (node: HTMLElement, options?: Record<string, unknown>) => any;
  tileLayer: (url: string, options?: Record<string, unknown>) => any;
  marker: (latlng: [number, number], options?: Record<string, unknown>) => any;
  divIcon: (options?: Record<string, unknown>) => any;
};
declare global { interface Window { L?: LeafletLike } }

function zoomForRadius(radius: number) {
  if (radius <= 3) return 14;
  if (radius <= 7) return 13;
  if (radius <= 15) return 12;
  if (radius <= 30) return 11;
  return 10;
}

function escapeHtml(value: string) {
  return value.replace(/[&<>'\"]/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '\"': '&quot;' }[char] ?? char));
}

export default function SearchResults({ locale, place, radius, center, items, metaLabel }: { locale: string; place: string; radius: number; center: GeoPoint; items: ResultItem[]; metaLabel: string }) {
  const en = locale === 'en';
  const [showMap, setShowMap] = useState(false);
  const [activeSlug, setActiveSlug] = useState<string | null>(items[0]?.slug ?? null);
  const [favoriteCounts, setFavoriteCounts] = useState<Record<string, number>>({});
  const cardRefs = useRef<Record<string, HTMLAnchorElement | null>>({});
  const mapNodeRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<any>(null);
  const markerLayerRef = useRef<any[]>([]);
  const zoom = zoomForRadius(radius);

  const markerGroups = useMemo(() => {
    const groups = new Map<string, ResultItem[]>();
    items.forEach(item => {
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
    setShowMap(false);
    requestAnimationFrame(() => cardRefs.current[slug]?.scrollIntoView({ behavior: 'smooth', block: 'center' }));
  }

  useEffect(() => {
    const slugs = Array.from(new Set(items.map(item => item.slug).filter(Boolean)));
    if (!slugs.length) {
      setFavoriteCounts({});
      return;
    }

    const controller = new AbortController();
    const syncCounts = async () => {
      try {
        const response = await fetch(`/api/favorites/count?slugs=${encodeURIComponent(slugs.join(','))}`, { cache: 'no-store', signal: controller.signal });
        if (!response.ok) return;
        const payload = await response.json() as { counts?: Record<string, number> };
        setFavoriteCounts(payload.counts ?? {});
      } catch (error) {
        if ((error as Error).name !== 'AbortError') console.warn('Favorite count sync failed', error);
      }
    };

    void syncCounts();
    window.addEventListener('hyrbart:favorites-changed', syncCounts);
    return () => {
      controller.abort();
      window.removeEventListener('hyrbart:favorites-changed', syncCounts);
    };
  }, [items]);

  useEffect(() => {
    if (!showMap) {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
        markerLayerRef.current = [];
      }
      return;
    }

    const cssId = 'leaflet-css-hyrbart';
    if (!document.getElementById(cssId)) {
      const link = document.createElement('link');
      link.id = cssId;
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(link);
    }

    function initialiseMap() {
      const L = window.L;
      const node = mapNodeRef.current;
      if (!L || !node || mapInstanceRef.current) return;
      const map = L.map(node, { zoomControl: true, attributionControl: true, dragging: true, scrollWheelZoom: true, doubleClickZoom: true, touchZoom: true });
      map.setView([center.lat, center.lng], zoom);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '&copy; OpenStreetMap' }).addTo(map);
      mapInstanceRef.current = map;
      setTimeout(() => map.invalidateSize(), 0);
    }

    if (window.L) initialiseMap();
    else {
      const existing = document.getElementById('leaflet-js-hyrbart') as HTMLScriptElement | null;
      if (existing) existing.addEventListener('load', initialiseMap, { once: true });
      else {
        const script = document.createElement('script');
        script.id = 'leaflet-js-hyrbart';
        script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
        script.async = true;
        script.onload = initialiseMap;
        document.body.appendChild(script);
      }
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
        markerLayerRef.current = [];
      }
    };
  }, [showMap, center.lat, center.lng, zoom]);

  useEffect(() => {
    if (!showMap) return;
    const L = window.L;
    const map = mapInstanceRef.current;
    if (!L || !map) return;
    markerLayerRef.current.forEach(marker => marker.remove());
    markerLayerRef.current = [];
    markerGroups.forEach(group => {
      const first = group[0];
      if (first.lat == null || first.lng == null) return;
      const active = group.some(item => item.slug === activeSlug);
      const label = `${escapeHtml(first.mapLabel)}${group.length > 1 ? ` · ${group.length}` : ''}`;
      const icon = L.divIcon({ className: 'hyrbartLeafletIcon2', html: `<span class="mapPrice2 leafletPrice2${active ? ' active' : ''}">${label}</span>`, iconSize: undefined, iconAnchor: undefined });
      const marker = L.marker([first.lat, first.lng], { icon }).addTo(map);
      marker.on('click', () => chooseMarker(first.slug));
      markerLayerRef.current.push(marker);
    });
  }, [markerGroups, activeSlug, showMap]);

  return (
    <>
      <div className="searchResultsViewBar133">
        <span>{metaLabel}</span>
        <button type="button" onClick={() => setShowMap(value => !value)} aria-pressed={showMap}>
          <span aria-hidden="true">{showMap ? '☷' : '⌖'}</span>
          {showMap ? (en ? 'Show list' : 'Visa lista') : (en ? 'Show map' : 'Visa karta')}
        </button>
      </div>

      {showMap ? (
        <section className="resultsMap2 searchResultsMap133" aria-label={en ? 'Map of search results' : 'Karta över sökresultat'}>
          <div ref={mapNodeRef} className="resultsLeafletMap2" />
          <span className="mapAreaNotice2">{radius} km · {place}</span>
        </section>
      ) : null}

      <section className="productGrid2">
        {items.map(item => {
          const favoriteCount = favoriteCounts[item.slug] ?? 0;
          return (
          <Link
            ref={node => { cardRefs.current[item.slug] = node; }}
            href={item.href}
            className={`productTile2 searchResultTile2${activeSlug === item.slug ? ' activeMapResult133' : ''}`}
            key={item.slug}
            onFocus={() => setActiveSlug(item.slug)}
            onMouseEnter={() => setActiveSlug(item.slug)}
            onTouchStart={() => setActiveSlug(item.slug)}
          >
            <div className="productTileVisual2">
              <ProductVisual kind="cleaner" accent={item.accent} imageSrc={item.image} imageAlt={`${item.brand} ${item.name}`} />
              <ProductBadgeLabel badge={item.badge} locale={locale} />
            </div>
            <div className="productTileCopy2">
              <strong className="productTileTitle2"><span className="productTileBrand2">{item.brand}</span><span className="productTileName2">{item.name}</span></strong>
              <span>{item.type}</span>
              {item.rating != null && item.reviewCount ? <span className="productReviewMini2">★ {item.rating.toFixed(1).replace('.', ',')} · {item.reviewCount} {en ? 'reviews' : 'omdömen'}</span> : null}
              {favoriteCount > 0 ? <span className="productFavoriteCount124" aria-label={en ? `${favoriteCount} favorites` : `${favoriteCount} favoritmarkeringar`}>♡ {favoriteCount}</span> : null}
              {item.distanceKm != null ? <span className="productDistance2">{item.distanceKm < .1 ? (en ? '< 0.1 km away' : '< 0,1 km bort') : `${item.distanceKm.toLocaleString(en ? 'en-GB' : 'sv-SE', { maximumFractionDigits: 1 })} km ${en ? 'away' : 'bort'}`}</span> : null}
              <b>{item.priceLabel}</b>
            </div>
          </Link>
          );
        })}
      </section>

      <style jsx>{`
        .searchResultsViewBar133 { display:flex; align-items:center; justify-content:space-between; gap:12px; margin:4px 0 14px; }
        .searchResultsViewBar133 > span { color:var(--muted); font-size:.92rem; }
        .searchResultsViewBar133 button { display:inline-flex; align-items:center; gap:7px; min-height:40px; padding:8px 13px; border:1px solid var(--line); border-radius:999px; background:#fff; color:var(--ink); font-weight:800; cursor:pointer; }
        .searchResultsViewBar133 button span { font-size:1.05rem; }
        .searchResultsMap133 { margin-bottom:14px; }
        .productFavoriteCount124 { color:var(--muted); font-size:.88rem; font-weight:700; }
      `}</style>
    </>
  );
}
