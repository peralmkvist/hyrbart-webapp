import Link from 'next/link';
import { getProducts } from '@/lib/sanity-products';
import ProductVisual from '@/components/ProductVisual';
import ProductSearchForm from '@/components/ProductSearchForm';
import RecentSearchRail from '@/components/RecentSearchRail';

const categoryDefinitions = [
  { value: 'Barnartiklar', sv: 'Barnartiklar', en: 'Baby & kids' }, { value: 'Belysning', sv: 'Belysning', en: 'Lighting' }, { value: 'Biltillbehör', sv: 'Biltillbehör', en: 'Car accessories' }, { value: 'Borra & Skruva', sv: 'Borra & Skruva', en: 'Drilling & screwdriving' }, { value: 'Handverktyg', sv: 'Handverktyg', en: 'Hand tools' }, { value: 'Hem & hushåll', sv: 'Hem & hushåll', en: 'Home & household' }, { value: 'Håltagning', sv: 'Håltagning', en: 'Hole making' }, { value: 'Kontor', sv: 'Kontor', en: 'Office' }, { value: 'Luftverktyg', sv: 'Luftverktyg', en: 'Air tools' }, { value: 'Mäta', sv: 'Mäta', en: 'Measuring' }, { value: 'Städa & Tvätta', sv: 'Städa & Tvätta', en: 'Cleaning & washing' }, { value: 'Såga & Slipa', sv: 'Såga & Slipa', en: 'Sawing & sanding' }, { value: 'Trädgård', sv: 'Trädgård', en: 'Garden' }, { value: 'Värme', sv: 'Värme', en: 'Heating' },
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
  const recentSource = [...products].slice(0, 10).map((p) => ({
    slug: p.slug, brand: p.brand, name: p.name, type: p.type, typeEn: p.typeEn, price: p.price, image: p.image, accent: p.accent,
  }));

  return (
    <div className="pageShell rentPage2 homeRentalLanding2">
      <div className="rentSticky2">
        <header className="brandHeader2" aria-label="Hyrbart">
          <Link href={`/${locale}`} className="hyrbartWordmark2" aria-label="Hyrbart"><span className="hyrbartWordmarkH2">H<i aria-hidden="true" /></span><span>yrbart</span></Link>
        </header>
        <section className="homeIntro2 rentIntro2">
          <h1>{en ? 'What do you want to rent?' : 'Vad vill du hyra?'}</h1>
          <ProductSearchForm locale={locale} initialPlace="Danderyd" initialRadius="10" initiallyCollapsed={false} />
        </section>
        <div className="categoryStrip2">
          <Link href={`/${locale}/produkter`} className="categoryChip2 active">{en ? 'All' : 'Alla'}</Link>
          {categoryDefinitions.map((item) => <Link key={item.value} href={`/${locale}/produkter?category=${encodeURIComponent(item.value)}`} className="categoryChip2">{en ? item.en : item.sv}</Link>)}
        </div>
      </div>

      <RecentSearchRail locale={locale} products={recentSource} />

      <section className="homePopular2 homeNearby2">
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
