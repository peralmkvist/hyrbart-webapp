'use client';

import { MouseEvent, useEffect, useState } from 'react';

const KEY = 'hyrbartFavorites';
const EVENT = 'hyrbart-favorites-changed';

function readFavorites(): string[] {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(KEY) || '[]');
    return Array.isArray(parsed) ? parsed.filter((value): value is string => typeof value === 'string') : [];
  } catch {
    return [];
  }
}

export default function FavoriteButton({ slug, label, compact = false }: { slug: string; label?: string; compact?: boolean }) {
  const [favorite, setFavorite] = useState(false);

  useEffect(() => {
    const sync = () => setFavorite(readFavorites().includes(slug));
    sync();
    window.addEventListener(EVENT, sync);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener(EVENT, sync);
      window.removeEventListener('storage', sync);
    };
  }, [slug]);

  function toggle(event: MouseEvent<HTMLButtonElement>) {
    event.preventDefault();
    event.stopPropagation();
    const current = readFavorites();
    const next = current.includes(slug) ? current.filter((item) => item !== slug) : [slug, ...current];
    window.localStorage.setItem(KEY, JSON.stringify(next));
    setFavorite(next.includes(slug));
    window.dispatchEvent(new Event(EVENT));
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={favorite}
      aria-label={favorite ? 'Ta bort från favoriter' : 'Lägg till i favoriter'}
      title={favorite ? 'Ta bort från favoriter' : 'Lägg till i favoriter'}
      style={{
        width: compact ? 38 : 44,
        height: compact ? 38 : 44,
        borderRadius: '999px',
        border: '1px solid rgba(21,25,27,.12)',
        background: '#fff',
        display: 'inline-grid',
        placeItems: 'center',
        cursor: 'pointer',
        boxShadow: '0 3px 12px rgba(0,0,0,.08)',
        color: '#15191b',
        padding: 0,
      }}
    >
      <svg width={compact ? 20 : 23} height={compact ? 20 : 23} viewBox="0 0 24 24" aria-hidden="true">
        <path
          d="M12 20.5 3.8 12.7C1.1 10.1 1.2 5.9 4 3.7c2.4-1.9 5.8-1.4 8 1 2.2-2.4 5.6-2.9 8-1 2.8 2.2 2.9 6.4.2 9L12 20.5Z"
          fill={favorite ? '#ffcc00' : 'none'}
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinejoin="round"
        />
      </svg>
      {label ? <span style={{ position: 'absolute', clip: 'rect(0 0 0 0)' }}>{label}</span> : null}
    </button>
  );
}
