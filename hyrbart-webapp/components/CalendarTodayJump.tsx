'use client';

import { useEffect, useRef, useState } from 'react';

export default function CalendarTodayJump({ active = true }: { active?: boolean }) {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [direction, setDirection] = useState<'up' | 'down'>('up');

  useEffect(() => {
    if (!active) return;
    const button = buttonRef.current;
    const root = button?.closest<HTMLElement>('.hostCalendarPage');
    const scroller = root?.querySelector<HTMLElement>('.hostCalendarMonthsScroll');
    const todayMonth = root?.querySelector<HTMLElement>('[data-current-month="true"]');
    if (!scroller || !todayMonth) return;

    const todayTop = () => Math.max(0, todayMonth.offsetTop - 4);
    const updateDirection = () => {
      setDirection(scroller.scrollTop < todayTop() - 24 ? 'down' : 'up');
    };

    requestAnimationFrame(() => {
      scroller.scrollTo({ top: todayTop(), behavior: 'auto' });
      updateDirection();
    });

    scroller.addEventListener('scroll', updateDirection, { passive: true });
    return () => scroller.removeEventListener('scroll', updateDirection);
  }, [active]);

  const jumpToToday = () => {
    const root = buttonRef.current?.closest<HTMLElement>('.hostCalendarPage');
    const scroller = root?.querySelector<HTMLElement>('.hostCalendarMonthsScroll');
    const todayMonth = root?.querySelector<HTMLElement>('[data-current-month="true"]');
    if (!scroller || !todayMonth) return;
    scroller.scrollTo({ top: Math.max(0, todayMonth.offsetTop - 4), behavior: 'smooth' });
  };

  if (!active) return null;

  return (
    <button
      ref={buttonRef}
      type="button"
      className="calendarTodayJump"
      onClick={jumpToToday}
      aria-label={direction === 'down' ? 'Gå fram till idag' : 'Gå tillbaka till idag'}
      title={direction === 'down' ? 'Till idag' : 'Till idag'}
    >
      <svg viewBox="0 0 24 24" aria-hidden="true">
        {direction === 'down'
          ? <path d="M12 5v14M6.5 13.5 12 19l5.5-5.5" />
          : <path d="M12 19V5M6.5 10.5 12 5l5.5 5.5" />}
      </svg>
    </button>
  );
}
