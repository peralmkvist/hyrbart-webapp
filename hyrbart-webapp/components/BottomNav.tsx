'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BookIcon, PersonIcon, SearchIcon } from './Icons';

export default function BottomNav() {
  const pathname = usePathname();
  const isEnglish = pathname === '/en' || pathname.startsWith('/en/');
  const locale = isEnglish ? 'en' : 'sv';

  const labels = isEnglish
    ? { about: 'About', products: 'Products', terms: 'Rental terms', aria: 'Main menu' }
    : { about: 'Om', products: 'Produkter', terms: 'Hyresvillkor', aria: 'Huvudmeny' };

  const items = [
    {
      href: `/${locale}`,
      label: labels.about,
      Icon: PersonIcon,
      match: (p: string) => p === `/${locale}`,
    },
    {
      href: `/${locale}/produkter`,
      label: labels.products,
      Icon: SearchIcon,
      match: (p: string) => p.startsWith(`/${locale}/produkter`),
    },
    {
      href: `/${locale}/hyresvillkor`,
      label: labels.terms,
      Icon: BookIcon,
      match: (p: string) => p.startsWith(`/${locale}/hyresvillkor`),
    },
  ];

  return (
    <nav className="liquidNav" aria-label={labels.aria}>
      {items.map(({ href, label, Icon, match }) => {
        const active = match(pathname);
        return (
          <Link
            key={href}
            href={href}
            className={`navItem ${active ? 'active' : ''}`}
            aria-current={active ? 'page' : undefined}
          >
            <span className="activeLens" aria-hidden="true" />
            <Icon className="navIcon" />
            <span>{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
