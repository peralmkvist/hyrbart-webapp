'use client';

import { useEffect, useState } from 'react';

const EVENT = 'hyrbart:favorites-changed';

function loginPath() {
  const en = /\/(?:topsecret\/)?en(?:\/|$)/.test(window.location.pathname);
  return `/topsecret/${en ? 'en' : 'sv'}/logga-in`;
}

export default function ProductPageActions({ slug, title, locale }: { slug: string; title: string; locale: string }) {
  const en = locale === 'en';
  const [favorite, setFavorite] = useState(false);
  const [savingFavorite, setSavingFavorite] = useState(false);
  const [shared, setShared] = useState(false);

  async function syncFavorite() {
    try {
      const response = await fetch('/api/favorites', { cache: 'no-store' });
      if (response.status === 401) {
        setFavorite(false);
        return;
      }
      if (!response.ok) return;
      const data = await response.json() as { favorites?: string[] };
      setFavorite((data.favorites ?? []).includes(slug));
    } catch {}
  }

  useEffect(() => {
    void syncFavorite();
    const listener = () => void syncFavorite();
    window.addEventListener(EVENT, listener);
    return () => window.removeEventListener(EVENT, listener);
  }, [slug]);

  async function toggleFavorite() {
    if (savingFavorite) return;
    setSavingFavorite(true);
    try {
      const next = !favorite;
      const response = await fetch('/api/favorites', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ slug, favorite: next }),
      });
      if (response.status === 401) {
        window.location.href = loginPath();
        return;
      }
      if (!response.ok) throw new Error('Could not update favorite');
      const data = await response.json() as { favorites?: string[] };
      setFavorite((data.favorites ?? []).includes(slug));
      window.dispatchEvent(new Event(EVENT));
    } catch {} finally {
      setSavingFavorite(false);
    }
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
    <button type="button" className={`productCircleAction2 ${favorite ? 'active' : ''}`} onClick={toggleFavorite} disabled={savingFavorite} aria-pressed={favorite} aria-label={favorite ? (en ? 'Remove from favorites' : 'Ta bort från favoriter') : (en ? 'Add to favorites' : 'Lägg till i favoriter')}>
      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78L12 21.23l8.84-8.84a5.5 5.5 0 0 0 0-7.78Z"/></svg>
    </button>
    <button type="button" className="productCircleAction2" onClick={share} aria-label={en ? 'Share listing' : 'Dela annons'}>
      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 16V3m0 0 4 4m-4-4L8 7M5 11v8a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-8"/></svg>
    </button>
    {shared ? <span className="productShareToast2">{en ? 'Link copied' : 'Länk kopierad'}</span> : null}
  </div>;
}
