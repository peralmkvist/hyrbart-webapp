'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
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

const focusableSelector = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

export default function ExternalHistoryModalSetting({ locale }: { locale: string }) {
  const en = locale === 'en';
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLElement>(null);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const focusPanel = () => {
      const focusable = Array.from(panelRef.current?.querySelectorAll<HTMLElement>(focusableSelector) ?? []);
      (focusable[0] ?? panelRef.current)?.focus();
    };
    const frame = window.requestAnimationFrame(focusPanel);

    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        setOpen(false);
        return;
      }
      if (event.key !== 'Tab' || !panelRef.current) return;
      const focusable = Array.from(panelRef.current.querySelectorAll<HTMLElement>(focusableSelector));
      if (!focusable.length) {
        event.preventDefault();
        panelRef.current.focus();
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    window.addEventListener('keydown', onKey);
    return () => {
      window.cancelAnimationFrame(frame);
      document.body.style.overflow = previous;
      window.removeEventListener('keydown', onKey);
      triggerRef.current?.focus();
    };
  }, [open]);

  const modal = open && mounted ? createPortal(
    <div className="profileModalBackdrop" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget) setOpen(false); }}>
      <section ref={panelRef} tabIndex={-1} className="profileModalPanel" role="dialog" aria-modal="true" aria-labelledby="external-history-title">
        <header className="profileModalHeader">
          <div>
            <span className="profileModalEyebrow">{en ? 'VERIFIED HISTORY' : 'VERIFIERAD HISTORIK'}</span>
            <h2 id="external-history-title">{en ? 'Bring your history' : 'Ta med din historik'}</h2>
          </div>
          <button type="button" className="profileModalClose" onClick={() => setOpen(false)} aria-label={en ? 'Close' : 'Stäng'}>×</button>
        </header>
        <div className="profileModalBody"><ExternalHistoryForm locale={locale}/></div>
      </section>
    </div>,
    document.body
  ) : null;

  return <>
    <button ref={triggerRef} type="button" className="profileMenuRow profileMenuButton" onClick={() => setOpen(true)}>
      <HistoryIcon />
      <span className="profileMenuLabel">{en ? 'Bring verified history from another platform' : 'Ta med verifierad historik från annan plattform'}</span>
      <span className="profileChevron" aria-hidden="true">›</span>
    </button>
    {modal}
  </>;
}
