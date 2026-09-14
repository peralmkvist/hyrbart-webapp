'use client';

import { usePathname } from 'next/navigation';

export default function GlobalSkipLink() {
  const pathname = usePathname();
  const en = /\/(?:topsecret\/)?en(?:\/|$)/.test(pathname);
  return <a className="skipLink" href="#main-content">{en ? 'Skip to content' : 'Hoppa till innehåll'}</a>;
}
