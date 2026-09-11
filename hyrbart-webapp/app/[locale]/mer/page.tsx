import Link from 'next/link';
import { ForwardIcon } from '@/components/Icons';

export default async function MorePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const en = locale === 'en';
  const items = en
    ? [
        ['About Hyrbart', '#'], ['How it works', '#'], ['Terms', `/${locale}/hyresvillkor`],
        ['Privacy', '#'], ['Contact', '#'], ['Help & FAQ', '#']
      ]
    : [
        ['Om Hyrbart', '#'], ['Så funkar det', '#'], ['Villkor', `/${locale}/hyresvillkor`],
        ['Integritet', '#'], ['Kontakt', '#'], ['Hjälp & FAQ', '#']
      ];

  return <section className="ds2Page"><h1>{en ? 'More' : 'Mer'}</h1><div className="ds2List">
    {items.map(([label, href]) => <Link className="ds2Row" href={href} key={label}><strong>{label}</strong><ForwardIcon width={20} height={20} /></Link>)}
  </div></section>;
}
