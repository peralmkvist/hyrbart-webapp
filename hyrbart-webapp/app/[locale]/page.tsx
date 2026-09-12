import Link from 'next/link';
import ProductSearchForm from '@/components/ProductSearchForm';
import { ArrowIcon, CategoryIcon } from '@/components/Icons';

const popularCategories = [
  { sv: 'Verktyg', en: 'Tools', icon: 'Borra & Skruva' },
  { sv: 'Friluftsliv', en: 'Outdoors', icon: 'Trädgård' },
  { sv: 'Transport', en: 'Transport', icon: 'Biltillbehör' },
  { sv: 'Hem & trädgård', en: 'Home & garden', icon: 'Hem & hushåll' },
  { sv: 'Barnartiklar', en: 'Baby & kids', icon: 'Hem & hushåll' },
  { sv: 'Foto & film', en: 'Photo & film', icon: 'Foto & Teknik' },
  { sv: 'Event', en: 'Events', icon: 'Belysning' },
  { sv: 'Möbler', en: 'Furniture', icon: 'Kontor' },
  { sv: 'Städ & rengöring', en: 'Cleaning', icon: 'Städa & Tvätta' },
  { sv: 'Sport & fritid', en: 'Sports & leisure', icon: 'Mäta' },
];

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const en = locale === 'en';

  return (
    <div className="pageShell rentPage2 homeRentalLanding2 homeLanding3">
      <div className="rentSticky2 homeTop3">
        <header className="brandHeader2" aria-label="Hyrbart">
          <Link href={`/${locale}`} className="hyrbartWordmark2" aria-label="Hyrbart"><span className="hyrbartWordmarkH2">H<i aria-hidden="true" /></span><span>yrbart</span></Link>
        </header>
        <section className="homeIntro2 rentIntro2">
          <h1>{en ? 'What do you want to rent?' : 'Vad vill du hyra?'}</h1>
          <ProductSearchForm locale={locale} initialPlace="" initialRadius="10" initiallyCollapsed={false} />
        </section>
      </div>

      <section className="homeCategorySection3" aria-labelledby="popular-categories-heading">
        <div className="sectionHeading2 homeCategoryHeading3">
          <h2 id="popular-categories-heading">{en ? 'Popular categories' : 'Populära kategorier'}</h2>
          <Link href={`/${locale}/produkter`}>{en ? 'See all' : 'Visa alla'}</Link>
        </div>
        <div className="homeCategoryGrid3">
          {popularCategories.map((item) => {
            const label = en ? item.en : item.sv;
            return (
              <Link key={item.sv} href={`/${locale}/produkter?q=${encodeURIComponent(label)}`} className="homeCategoryChip3">
                <span className="homeCategoryIcon3"><CategoryIcon category={item.icon} /></span>
                <span>{label}</span>
              </Link>
            );
          })}
        </div>
      </section>

      <section className="partnerAd3" aria-label={en ? 'Advertisement from Byggmax' : 'Annons från Byggmax'}>
        <div className="partnerAdCopy3">
          <span className="partnerAdLabel3">{en ? 'Advertisement' : 'Annons'}</span>
          <div className="partnerLockup3"><strong>Hyrbart</strong><span>×</span><b>BYGGMAX</b></div>
          <h2>{en ? 'Sweden’s things should be used more.' : 'Sveriges prylar ska användas mer.'}</h2>
          <p>{en ? 'Rent what you only need sometimes.' : 'Hyr det du bara behöver ibland.'}<br/><strong>{en ? 'Buy what you need all the time.' : 'Köp det du behöver hela tiden.'}</strong></p>
          <a href="https://www.byggmax.se/" target="_blank" rel="noreferrer sponsored" className="partnerAdButton3">{en ? 'Visit Byggmax' : 'Till Byggmax'}<ArrowIcon /></a>
        </div>
        <div className="partnerAdVisual3" aria-hidden="true">
          <img src="/byggmax-hyrbart-env.svg" alt="" />
        </div>
      </section>
    </div>
  );
}
