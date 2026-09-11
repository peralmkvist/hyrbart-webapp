'use client';

import { useEffect, useState } from 'react';

const FAVORITES_KEY = 'hyrbartFavorites';

function readFavorites(): string[] {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(FAVORITES_KEY) || '[]');
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === 'string') : [];
  } catch {
    return [];
  }
}

export default function ProductPageActions({ slug, title, locale }: { slug: string; title: string; locale: string }) {
  const en = locale === 'en';
  const [favorite, setFavorite] = useState(false);
  const [shared, setShared] = useState(false);

  useEffect(() => { setFavorite(readFavorites().includes(slug)); }, [slug]);

  function toggleFavorite() {
    const current = readFavorites();
    const next = current.includes(slug) ? current.filter((item) => item !== slug) : [slug, ...current].slice(0, 100);
    window.localStorage.setItem(FAVORITES_KEY, JSON.stringify(next));
    setFavorite(next.includes(slug));
    window.dispatchEvent(new Event('hyrbart:favorites-changed'));
  }

  async function share() {
    const url = window.location.href;
    try {
      if (navigator.share) await navigator.share({ title, url });
      else {
        await navigator.clipboard.writeText(url);
        setShared(true);
        window.setTimeout(() => setShared(false), 1800);
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return;
    }
  }

  return <div className="productPageActions2">
    <button type="button" className={`productCircleAction2 ${favorite ? 'active' : ''}`} onClick={toggleFavorite} aria-pressed={favorite} aria-label={favorite ? (en ? 'Remove from favorites' : 'Ta bort från favoriter') : (en ? 'Add to favorites' : 'Lägg till i favoriter')}>
      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78L12 21.23l8.84-8.84a5.5 5.5 0 0 0 0-7.78Z"/></svg>
    </button>
    <button type="button" className="productCircleAction2" onClick={share} aria-label={en ? 'Share listing' : 'Dela annons'}>
      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 16V3m0 0 4 4m-4-4L8 7M5 11v8a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-8"/></svg>
    </button>
    {shared ? <span className="productShareToast2">{en ? 'Link copied' : 'Länk kopierad'}</span> : null}
  </div>;
}
