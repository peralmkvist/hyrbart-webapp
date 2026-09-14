'use client';

import { useEffect, useState } from 'react';

type Props = { userId: string; locale: string; compact?: boolean };

export default function FollowButton({ userId, locale, compact = false }: Props) {
  const en = locale === 'en';
  const [following, setFollowing] = useState(false);
  const [count, setCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [authenticated, setAuthenticated] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const response = await fetch(`/api/follows?target=${encodeURIComponent(userId)}`, { cache: 'no-store' });
        if (cancelled) return;
        if (response.status === 401) { setAuthenticated(false); return; }
        if (!response.ok) return;
        const data = await response.json() as { following?: boolean; followerCount?: number };
        setFollowing(Boolean(data.following));
        setCount(Number(data.followerCount || 0));
      } finally { if (!cancelled) setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, [userId]);

  async function toggle() {
    if (!authenticated) {
      window.location.href = `/topsecret/${locale}/logga-in?next=${encodeURIComponent(window.location.pathname)}`;
      return;
    }
    setSaving(true);
    try {
      const response = await fetch('/api/follows', {
        method: following ? 'DELETE' : 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ followedUserId: userId }),
      });
      if (response.status === 401) { setAuthenticated(false); return; }
      if (!response.ok) return;
      const data = await response.json() as { following: boolean; followerCount: number };
      setFollowing(data.following);
      setCount(data.followerCount);
      window.dispatchEvent(new CustomEvent('hyrbart:follows-changed', { detail: { userId, following: data.following } }));
    } finally { setSaving(false); }
  }

  if (loading) return <button type="button" className="followButton2" disabled aria-busy="true">{en ? 'Loading…' : 'Laddar…'}</button>;
  return <div className={`followControl2 ${compact ? 'compact' : ''}`}>
    <button type="button" className={`followButton2 ${following ? 'following' : ''}`} onClick={() => void toggle()} disabled={saving} aria-pressed={following}>
      {saving ? (en ? 'Saving…' : 'Sparar…') : following ? (en ? 'Following' : 'Följer') : (en ? 'Follow' : 'Följ')}
    </button>
    {count !== null ? <span className="followCount2">{count} {en ? (count === 1 ? 'follower' : 'followers') : (count === 1 ? 'följare' : 'följare')}</span> : null}
  </div>;
}
