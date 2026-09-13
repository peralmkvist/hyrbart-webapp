'use client';

import { useEffect, useState } from 'react';
import ExternalHistoryForm from './ExternalHistoryForm';

const HistoryIcon = () => (
  <span className="profileMenuIcon" aria-hidden="true">
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 12a9 9 0 1 0 3-6.7L3 8"/>
      <path d="M3 3v5h5"/>
      <path d="M12 7v5l3 2"/>
    </svg>
  </span>
);

export default function ExternalHistoryModalSetting({ locale }: { locale: string }) {
  const en = locale === 'en';
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return <>
    <button type="button" className="profileMenuRow profileMenuButton" onClick={() => setOpen(true)}>
      <HistoryIcon />
      <span className="profileMenuLabel">{en ? 'Bring verified history from another platform' : 'Ta med verifierad historik från annan plattform'}</span>
      <span className="profileChevron" aria-hidden="true">›</span>
    </button>
    {open ? <div className="profileModalBackdrop" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget) setOpen(false); }}>
      <section className="profileModalPanel" role="dialog" aria-modal="true" aria-labelledby="external-history-title">
        <header className="profileModalHeader">
          <div>
            <span className="profileModalEyebrow">{en ? 'VERIFIED HISTORY' : 'VERIFIERAD HISTORIK'}</span>
            <h2 id="external-history-title">{en ? 'Bring your history' : 'Ta med din historik'}</h2>
          </div>
          <button type="button" className="profileModalClose" onClick={() => setOpen(false)} aria-label={en ? 'Close' : 'Stäng'}>×</button>
        </header>
        <div className="profileModalBody"><ExternalHistoryForm locale={locale}/></div>
      </section>
    </div> : null}
  </>;
}
