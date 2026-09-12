'use client';

import { useLayoutEffect, useRef, useState } from 'react';

export default function CalendarTodayJump({ active = true }: { active?: boolean }) {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [direction, setDirection] = useState<'up' | 'down'>('up');

  useLayoutEffect(() => {
    if (!active) return;
    const button = buttonRef.current;
    const root = button?.closest<HTMLElement>('.hostCalendarPage');
    const scroller = root?.querySelector<HTMLElement>('.hostCalendarMonthsScroll');
    const todayMonth = root?.querySelector<HTMLElement>('[data-current-month="true"]');
    if (!scroller || !todayMonth) return;

    const monthTop = () => Math.max(0, todayMonth.offsetTop);
    const updateDirection = () => {
      setDirection(scroller.scrollTop < monthTop() - 24 ? 'down' : 'up');
    };
    const resetToCurrentMonth = () => {
      scroller.scrollTop = monthTop();
      updateDirection();
    };

    /* iOS may restore an inner scroll position after first paint.
       Re-apply the intended current-month start for the next two frames. */
    resetToCurrentMonth();
    const raf1 = requestAnimationFrame(() => {
      resetToCurrentMonth();
      const raf2 = requestAnimationFrame(resetToCurrentMonth);
      (scroller as HTMLElement & { __calendarRaf?: number }).__calendarRaf = raf2;
    });

    scroller.addEventListener('scroll', updateDirection, { passive: true });
    return () => {
      cancelAnimationFrame(raf1);
      const raf2 = (scroller as HTMLElement & { __calendarRaf?: number }).__calendarRaf;
      if (raf2) cancelAnimationFrame(raf2);
      scroller.removeEventListener('scroll', updateDirection);
    };
  }, [active]);

  const jumpToToday = () => {
    const root = buttonRef.current?.closest<HTMLElement>('.hostCalendarPage');
    const scroller = root?.querySelector<HTMLElement>('.hostCalendarMonthsScroll');
    const todayMonth = root?.querySelector<HTMLElement>('[data-current-month="true"]');
    if (!scroller || !todayMonth) return;
    scroller.scrollTo({ top: Math.max(0, todayMonth.offsetTop), behavior: 'smooth' });
  };

  if (!active) return null;

  return (
    <button
      ref={buttonRef}
      type="button"
      className="calendarTodayJump"
      onClick={jumpToToday}
      aria-label={direction === 'down' ? 'Gå fram till idag' : 'Gå tillbaka till idag'}
      title="Till idag"
    >
      <svg viewBox="0 0 24 24" aria-hidden="true">
        {direction === 'down'
          ? <path d="M12 5v14M6.5 13.5 12 19l5.5-5.5" />
          : <path d="M12 19V5M6.5 10.5 12 5l5.5 5.5" />}
      </svg>
    </button>
  );
}
