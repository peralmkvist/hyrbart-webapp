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

    const monthTop = () => {
      const scrollerRect = scroller.getBoundingClientRect();
      const monthRect = todayMonth.getBoundingClientRect();
      return Math.max(0, scroller.scrollTop + monthRect.top - scrollerRect.top);
    };

    const updateDirection = () => {
      setDirection(scroller.scrollTop < monthTop() - 24 ? 'down' : 'up');
    };

    const resetToCurrentMonth = () => {
      scroller.scrollTo({ top: monthTop(), behavior: 'auto' });
      updateDirection();
    };

    /* Safari can restore nested scroll positions after hydration.
       Apply our intended current-month start immediately, after paint,
       and once more shortly afterwards so the month always starts at its header. */
    resetToCurrentMonth();
    const raf1 = requestAnimationFrame(() => {
      resetToCurrentMonth();
      requestAnimationFrame(resetToCurrentMonth);
    });
    const settleTimer = window.setTimeout(resetToCurrentMonth, 140);

    scroller.addEventListener('scroll', updateDirection, { passive: true });
    return () => {
      cancelAnimationFrame(raf1);
      window.clearTimeout(settleTimer);
      scroller.removeEventListener('scroll', updateDirection);
    };
  }, [active]);

  const jumpToToday = () => {
    const root = buttonRef.current?.closest<HTMLElement>('.hostCalendarPage');
    const scroller = root?.querySelector<HTMLElement>('.hostCalendarMonthsScroll');
    const todayMonth = root?.querySelector<HTMLElement>('[data-current-month="true"]');
    if (!scroller || !todayMonth) return;

    const scrollerRect = scroller.getBoundingClientRect();
    const monthRect = todayMonth.getBoundingClientRect();
    const target = Math.max(0, scroller.scrollTop + monthRect.top - scrollerRect.top);
    scroller.scrollTo({ top: target, behavior: 'smooth' });
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
