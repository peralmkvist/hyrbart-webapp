'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { CalendarIcon, HeartIcon, ListingsIcon, PersonIcon, SearchIcon } from './Icons';

function AddCircleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 8v8M8 12h8" />
    </svg>
  );
}

type BookingSummary = { status?: string; role?: 'owner' | 'renter' };

export default function BottomNav() {
  const pathname = usePathname();
  const [hasBookingAction, setHasBookingAction] = useState(false);
  const isPrivateApp = pathname === '/topsecret' || pathname.startsWith('/topsecret/');

  if (!isPrivateApp) return null;

  const appPath = pathname.replace(/^\/topsecret/, '') || '/sv';
  const isStandaloneGuide = /^\/(sv|en)\/produkter\/[^/]+\/guide\/?$/.test(appPath);
  const isAdmin = /^\/(sv|en)\/admin(?:\/|$)/.test(appPath);
  if (isStandaloneGuide || isAdmin) return null;

  const isEnglish = appPath === '/en' || appPath.startsWith('/en/');
  const locale = isEnglish ? 'en' : 'sv';
  const base = `/topsecret/${locale}`;
  const hostMode = appPath === `/${locale}/vard` || appPath.startsWith(`/${locale}/vard/`);

  useEffect(() => {
    let active = true;
    const load = () => {
      if (!hostMode) {
        setHasBookingAction(false);
        return;
      }
      fetch('/api/booking-requests', { cache: 'no-store' })
        .then(async response => response.ok ? response.json() : { bookings: [] })
        .then((data: { bookings?: BookingSummary[] }) => {
          if (!active) return;
          const needsAction = (data.bookings ?? []).some(
            booking => booking.role === 'owner' && (booking.status === 'requested' || booking.status === 'reserved')
          );
          setHasBookingAction(needsAction);
        })
        .catch(() => { if (active) setHasBookingAction(false); });
    };
    load();
    const onVisibility = () => { if (document.visibilityState === 'visible') load(); };
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('focus', load);
    window.addEventListener('hyrbart:bookings-changed', load);
    return () => {
      active = false;
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('focus', load);
      window.removeEventListener('hyrbart:bookings-changed', load);
    };
  }, [hostMode, pathname]);

  const renterLabels = isEnglish
    ? { explore: 'Explore', calendar: 'Bookings', wishlist: 'Favorites', profile: 'Profile', aria: 'Renter menu' }
    : { explore: 'Utforska', calendar: 'Bokningar', wishlist: 'Favoriter', profile: 'Profil', aria: 'Hyresmeny' };

  const hostLabels = isEnglish
    ? { calendar: 'Bookings', listings: 'Listings', add: 'Add', profile: 'Profile', aria: 'Host menu' }
    : { calendar: 'Bokningar', listings: 'Annonser', add: 'Lägg till', profile: 'Profil', aria: 'Uthyrarmeny' };

  const items = hostMode
    ? [
        { href: `${base}/vard/annonser`, label: hostLabels.listings, Icon: ListingsIcon, booking: false, match: (p: string) => p === `/${locale}/vard/annonser` },
        { href: `${base}/vard`, label: hostLabels.calendar, Icon: CalendarIcon, booking: true, match: (p: string) => p === `/${locale}/vard` || p.startsWith(`/${locale}/vard/bokningar`) },
        { href: `${base}/vard/annonser/ny`, label: hostLabels.add, Icon: AddCircleIcon, booking: false, match: (p: string) => p.startsWith(`/${locale}/vard/annonser/ny`) },
        { href: `${base}/vard/profil`, label: hostLabels.profile, Icon: PersonIcon, booking: false, match: (p: string) => p.startsWith(`/${locale}/vard/profil`) || p.startsWith(`/${locale}/vard/meny`) },
      ]
    : [
        { href: base, label: renterLabels.explore, Icon: SearchIcon, booking: false, match: (p: string) => p === `/${locale}` || p.startsWith(`/${locale}/produkter`) },
        { href: `${base}/kalender`, label: renterLabels.calendar, Icon: CalendarIcon, booking: false, match: (p: string) => p.startsWith(`/${locale}/kalender`) || p.startsWith(`/${locale}/bokningar`) },
        { href: `${base}/onskelista`, label: renterLabels.wishlist, Icon: HeartIcon, booking: false, match: (p: string) => p.startsWith(`/${locale}/onskelista`) },
        { href: `${base}/profil`, label: renterLabels.profile, Icon: PersonIcon, booking: false, match: (p: string) => p.startsWith(`/${locale}/profil`) || p.startsWith(`/${locale}/mer`) },
      ];

  return (
    <nav className={`liquidNav ${hostMode ? 'hostNav' : 'renterNav'}`} aria-label={hostMode ? hostLabels.aria : renterLabels.aria}>
      {items.map(({ href, label, Icon, booking, match }) => {
        const active = match(appPath);
        return (
          <Link key={href} href={href} className={`navItem ${active ? 'active' : ''}`} aria-current={active ? 'page' : undefined}>
            <span className="activeLens" aria-hidden="true" />
            <span className="navIconWrap">
              <Icon className="navIcon" />
              {booking && hasBookingAction ? <span className="bookingNotificationDot" aria-label="Ny bokningsförfrågan" /> : null}
            </span>
            <span>{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
