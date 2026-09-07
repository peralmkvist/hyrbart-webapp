'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BookIcon, HomeIcon, SearchIcon } from './Icons';

export default function BottomNav() {
  const pathname = usePathname();
  const isEnglish = pathname === '/en' || pathname.startsWith('/en/');
  const locale = isEnglish ? 'en' : 'sv';
  const labels = isEnglish
    ? { home: 'Home', products: 'Products', terms: 'Rental terms', aria: 'Main menu' }
    : { home: 'Hem', products: 'Produkter', terms: 'Hyresvillkor', aria: 'Huvudmeny' };

  if (pathname.includes('/guide')) return null;

  const items = [
    { href: `/${locale}`, label: labels.home, Icon: HomeIcon, match: (p: string) => p === `/${locale}` },
    { href: `/${locale}/produkter`, label: labels.products, Icon: SearchIcon, match: (p: string) => p.startsWith(`/${locale}/produkter`) },
    { href: `/${locale}/hyresvillkor`, label: labels.terms, Icon: BookIcon, match: (p: string) => p.startsWith(`/${locale}/hyresvillkor`) }
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
