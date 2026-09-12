'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { CalendarIcon, HeartIcon, ListingsIcon, MessageIcon, PersonIcon, SearchIcon } from './Icons';

function AddCircleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 8v8M8 12h8" />
    </svg>
  );
}

export default function BottomNav() {
  const pathname = usePathname();
  const isPrivateApp = pathname === '/topsecret' || pathname.startsWith('/topsecret/');
  if (!isPrivateApp) return null;

  const appPath = pathname.replace(/^\/topsecret/, '') || '/sv';
  const isStandaloneGuide = /^\/(sv|en)\/produkter\/[^/]+\/guide\/?$/.test(appPath);
  if (isStandaloneGuide) return null;

  const isEnglish = appPath === '/en' || appPath.startsWith('/en/');
  const locale = isEnglish ? 'en' : 'sv';
  const base = `/topsecret/${locale}`;
  const hostMode = appPath === `/${locale}/vard` || appPath.startsWith(`/${locale}/vard/`);

  const renterLabels = isEnglish
    ? { explore: 'Explore', calendar: 'Calendar', wishlist: 'Favorites', messages: 'Messages', profile: 'Profile', aria: 'Renter menu' }
    : { explore: 'Utforska', calendar: 'Kalender', wishlist: 'Favoriter', messages: 'Meddelanden', profile: 'Profil', aria: 'Hyresmeny' };

  const hostLabels = isEnglish
    ? { calendar: 'Calendar', listings: 'Listings', add: 'Add', messages: 'Messages', profile: 'Profile', aria: 'Host menu' }
    : { calendar: 'Kalender', listings: 'Annonser', add: 'Lägg till', messages: 'Meddelanden', profile: 'Profil', aria: 'Uthyrarmeny' };

  const items = hostMode
    ? [
        { href: `${base}/vard/annonser`, label: hostLabels.listings, Icon: ListingsIcon, match: (p: string) => p === `/${locale}/vard/annonser` },
        { href: `${base}/vard`, label: hostLabels.calendar, Icon: CalendarIcon, match: (p: string) => p === `/${locale}/vard` },
        { href: `${base}/vard/annonser/ny`, label: hostLabels.add, Icon: AddCircleIcon, match: (p: string) => p.startsWith(`/${locale}/vard/annonser/ny`) },
        { href: `${base}/vard/meddelanden`, label: hostLabels.messages, Icon: MessageIcon, match: (p: string) => p.startsWith(`/${locale}/vard/meddelanden`) },
        { href: `${base}/vard/profil`, label: hostLabels.profile, Icon: PersonIcon, match: (p: string) => p.startsWith(`/${locale}/vard/profil`) || p.startsWith(`/${locale}/vard/meny`) },
      ]
    : [
        { href: base, label: renterLabels.explore, Icon: SearchIcon, match: (p: string) => p === `/${locale}` || p.startsWith(`/${locale}/produkter`) },
        { href: `${base}/kalender`, label: renterLabels.calendar, Icon: CalendarIcon, match: (p: string) => p.startsWith(`/${locale}/kalender`) },
        { href: `${base}/onskelista`, label: renterLabels.wishlist, Icon: HeartIcon, match: (p: string) => p.startsWith(`/${locale}/onskelista`) },
        { href: `${base}/meddelanden`, label: renterLabels.messages, Icon: MessageIcon, match: (p: string) => p.startsWith(`/${locale}/meddelanden`) },
        { href: `${base}/profil`, label: renterLabels.profile, Icon: PersonIcon, match: (p: string) => p.startsWith(`/${locale}/profil`) || p.startsWith(`/${locale}/mer`) },
      ];

  return (
    <nav className={`liquidNav ${hostMode ? 'hostNav' : 'renterNav'}`} aria-label={hostMode ? hostLabels.aria : renterLabels.aria}>
      {items.map(({ href, label, Icon, match }) => {
        const active = match(appPath);
        return (
          <Link key={href} href={href} className={`navItem ${active ? 'active' : ''}`} aria-current={active ? 'page' : undefined}>
            <span className="activeLens" aria-hidden="true" />
            <Icon className="navIcon" />
            <span>{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
