import Link from 'next/link';
import { ForwardIcon } from '@/components/Icons';

export default async function GuidesPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const en = locale === 'en';
  return <section className="ds2Page">
    <h1>{en ? 'Guides' : 'Guider'}</h1>
    <p className="ds2Intro">{en ? 'Practical guides for the products you rent.' : 'Praktiska guider för produkterna du hyr.'}</p>
    <div className="ds2List">
      <Link className="ds2Row" href={`/${locale}/produkter`}><strong>{en ? 'Find a product guide' : 'Hitta en produktguide'}</strong><ForwardIcon width={20} height={20}/></Link>
    </div>
  </section>;
}
