'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BookIcon, HomeIcon, MenuIcon, SearchIcon } from './Icons';

export default function BottomNav() {
  const pathname = usePathname();
  const isEnglish = pathname === '/en' || pathname.startsWith('/en/');
  const locale = isEnglish ? 'en' : 'sv';

  const labels = isEnglish
    ? { home: 'Home', rent: 'Rent', guides: 'Guides', more: 'More', aria: 'Main menu' }
    : { home: 'Hem', rent: 'Hyra', guides: 'Guider', more: 'Mer', aria: 'Huvudmeny' };

  const items = [
    { href: `/${locale}`, label: labels.home, Icon: HomeIcon, match: (p: string) => p === `/${locale}` },
    { href: `/${locale}/produkter`, label: labels.rent, Icon: SearchIcon, match: (p: string) => p.startsWith(`/${locale}/produkter`) },
    { href: `/${locale}/guider`, label: labels.guides, Icon: BookIcon, match: (p: string) => p.startsWith(`/${locale}/guider`) },
    { href: `/${locale}/mer`, label: labels.more, Icon: MenuIcon, match: (p: string) => p.startsWith(`/${locale}/mer`) || p.startsWith(`/${locale}/hyresvillkor`) }
  ];

  return (
    <nav className="liquidNav" aria-label={labels.aria}>
      {items.map(({ href, label, Icon, match }) => {
        const active = match(pathname);
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
