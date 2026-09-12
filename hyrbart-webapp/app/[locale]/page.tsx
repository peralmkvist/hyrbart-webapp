import Link from 'next/link';
import { getProducts } from '@/lib/sanity-products';
import ProductVisual from '@/components/ProductVisual';
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
  { sv: 'Bygg & renovering', en: 'Building & renovation', icon: 'Håltagning' },
  { sv: 'Släp & fordon', en: 'Trailers & vehicles', icon: 'Biltillbehör' },
  { sv: 'Husdjur', en: 'Pets', icon: 'Hem & hushåll' },
  { sv: 'Stegar & ställningar', en: 'Ladders & scaffolding', icon: 'Mäta' },
  { sv: 'Industri & proffs', en: 'Trade & professional', icon: 'Handverktyg' },
];

function formatPrice(price: string, en: boolean) {
  if (!en) return price;
  return price.replace(/^fr\.\s*/i, 'from ').replace(/\s*kr\/dygn$/i, ' SEK/day');
}

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const en = locale === 'en';
  const products = await getProducts();
  const popularNearby = [...products]
    .sort((a, b) => (b.reviewCount ?? 0) - (a.reviewCount ?? 0) || (b.rating ?? 0) - (a.rating ?? 0))
    .slice(0, 5);
  const adProduct = products.find((product) => product.category === 'Såga & Slipa') || products.find((product) => /såg/i.test(`${product.type} ${product.name}`)) || popularNearby[0];

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
          <span className="partnerAdShape3" />
          {adProduct ? <ProductVisual kind="cleaner" accent={adProduct.accent} imageSrc={adProduct.image} imageAlt="" /> : null}
          <span className="partnerAdTagline3">{en ? <>Build the<br/>good life.</> : <>Bygg det<br/>goda livet.</>}</span>
        </div>
      </section>

      <section className="homePopular2 homeNearby2 homeNearby3">
        <div className="sectionHeading2"><h2>{en ? 'Popular near you' : 'Populärt i närområdet'}</h2><Link href={`/${locale}/produkter?place=Danderyd&radius=10`}>{en ? 'See all' : 'Visa alla'}</Link></div>
        <div className="popularRail2">
          {popularNearby.map((product) => (
            <Link key={product.slug} href={`/${locale}/produkter/${product.slug}`} className="popularCard2">
              <div className="popularVisual2"><ProductVisual kind="cleaner" accent={product.accent} imageSrc={product.image} imageAlt={`${product.brand} ${product.name}`} /></div>
              <strong className="productTileTitle2"><span className="productTileBrand2">{product.brand}</span><span className="productTileName2">{product.name}</span></strong>
              <span>{en ? (product.typeEn ?? product.type) : product.type}</span>
              <b>{formatPrice(product.price, en)}</b>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
