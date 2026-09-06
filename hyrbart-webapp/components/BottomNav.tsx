'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BookIcon, HomeIcon, SearchIcon } from './Icons';

const items = [
  { href: '/', label: 'Hem', Icon: HomeIcon, match: (p: string) => p === '/' },
  { href: '/produkter', label: 'Produkter', Icon: SearchIcon, match: (p: string) => p.startsWith('/produkter') },
  { href: '/hyresvillkor', label: 'Hyresvillkor', Icon: BookIcon, match: (p: string) => p.startsWith('/hyresvillkor') }
];

export default function BottomNav() {
  const pathname = usePathname();

  // Guider är ett fokuserat arbetsläge och ska inte visa huvudnavigationen.
  if (pathname.includes('/guide')) return null;

  return (
    <nav className="liquidNav" aria-label="Huvudmeny">
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
