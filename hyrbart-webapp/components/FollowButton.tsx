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

  const buttonStyle = {border:'1px solid #111',borderRadius:999,padding:compact?'8px 14px':'10px 20px',background:following?'#fff':'#111',color:following?'#111':'#fff',fontWeight:800,cursor:saving?'wait':'pointer'} as const;
  if (loading) return <button type="button" disabled aria-busy="true" style={{...buttonStyle,opacity:.55}}>{en ? 'Loading…' : 'Laddar…'}</button>;
  return <div style={{display:'flex',alignItems:'center',gap:10,flexWrap:'wrap',justifyContent:compact?'flex-start':'center'}}>
    <button type="button" onClick={() => void toggle()} disabled={saving} aria-pressed={following} style={{...buttonStyle,opacity:saving?.65:1}}>
      {saving ? (en ? 'Saving…' : 'Sparar…') : following ? (en ? 'Following' : 'Följer') : (en ? 'Follow' : 'Följ')}
    </button>
    {count !== null ? <span style={{fontSize:13,color:'var(--muted)'}}>{count} {en ? (count === 1 ? 'follower' : 'followers') : 'följare'}</span> : null}
  </div>;
}
