'use client';

import { useState } from 'react';

export default function ShareButton({ title }: { title: string }) {
  const [copied, setCopied] = useState(false);

  async function share() {
    const url = window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({ title, url });
        return;
      }
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      // User cancelling the native share sheet is not an error we need to surface.
    }
  }

  return (
    <button
      type="button"
      onClick={share}
      aria-label="Dela annons"
      title="Dela annons"
      style={{
        width: 44,
        height: 44,
        borderRadius: '999px',
        border: '1px solid rgba(21,25,27,.12)',
        background: '#fff',
        display: 'inline-grid',
        placeItems: 'center',
        cursor: 'pointer',
        boxShadow: '0 3px 12px rgba(0,0,0,.08)',
        color: '#15191b',
        padding: 0,
        position: 'relative',
      }}
    >
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M12 3v12M7.5 7.5 12 3l4.5 4.5M5 11v8h14v-8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
      {copied ? <span style={{ position:'absolute', top:50, right:0, whiteSpace:'nowrap', background:'#15191b', color:'#fff', fontSize:12, borderRadius:8, padding:'6px 8px', zIndex:20 }}>Länk kopierad</span> : null}
    </button>
  );
}
