import Link from 'next/link';
import { getProducts } from '@/lib/sanity-products';
import ProductVisual from '@/components/ProductVisual';
import { ArrowIcon, CategoryIcon, SearchIcon } from '@/components/Icons';

const categoryDefinitions = [
  { value: 'Barnartiklar', sv: 'Barnartiklar', en: 'Baby & kids' },
  { value: 'Belysning', sv: 'Belysning', en: 'Lighting' },
  { value: 'Biltillbehör', sv: 'Biltillbehör', en: 'Car accessories' },
  { value: 'Borra & Skruva', sv: 'Borra & Skruva', en: 'Drilling & screwdriving' },
  { value: 'Handverktyg', sv: 'Handverktyg', en: 'Hand tools' },
  { value: 'Hem & hushåll', sv: 'Hem & hushåll', en: 'Home & household' },
  { value: 'Håltagning', sv: 'Håltagning', en: 'Hole making' },
  { value: 'Kontor', sv: 'Kontor', en: 'Office' },
  { value: 'Luftverktyg', sv: 'Luftverktyg', en: 'Air tools' },
  { value: 'Mäta', sv: 'Mäta', en: 'Measuring' },
  { value: 'Städa & Tvätta', sv: 'Städa & Tvätta', en: 'Cleaning & washing' },
  { value: 'Såga & Slipa', sv: 'Såga & Slipa', en: 'Sawing & sanding' },
  { value: 'Trädgård', sv: 'Trädgård', en: 'Garden' },
  { value: 'Värme', sv: 'Värme', en: 'Heating' },
];

function formatPrice(price: string, en: boolean) {
  if (!en) return price;
  return price.replace(/^fr\.\s*/i, 'from ').replace(/\s*kr\/dygn$/i, ' SEK/day');
}

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const en = locale === 'en';
  const products = await getProducts();
  const featured = [...products]
    .sort((a, b) => (b.reviewCount ?? 0) - (a.reviewCount ?? 0))
    .slice(0, 4);

  return (
    <div className="pageShell homePage2 discoveryHome21">
      <header className="brandHeader2" aria-label="Hyrbart">
        <Link href={`/${locale}`} className="hyrbartWordmark2" aria-label="Hyrbart">
          <span className="hyrbartWordmarkH2">H<i aria-hidden="true" /></span><span>yrbart</span>
        </Link>
      </header>

      <section className="homeIntro2 discoveryIntro21">
        <h1>{en ? 'What do you want to rent?' : 'Vad vill du hyra?'}</h1>
        <form action={`/${locale}/produkter`} method="get" className="searchField2 homeSearch2 discoverySearch21" role="search">
          <SearchIcon aria-hidden="true" />
          <input
            type="search"
            name="q"
            enterKeyHint="search"
            autoComplete="off"
            aria-label={en ? 'Search products' : 'Sök produkter'}
            placeholder={en ? 'Search product, category or use' : 'Sök produkt, kategori eller tillfälle'}
          />
          <button type="submit" aria-label={en ? 'Search' : 'Sök'}><ArrowIcon /></button>
        </form>
      </section>

      <section className="homeCategories2 discoveryCategories21" aria-label={en ? 'Categories' : 'Kategorier'}>
        {categoryDefinitions.map((category) => (
          <Link key={category.value} href={`/${locale}/produkter?category=${encodeURIComponent(category.value)}`}>
            <span className="categoryIconBubble2"><CategoryIcon category={category.value} /></span>
            <span>{en ? category.en : category.sv}</span>
          </Link>
        ))}
      </section>

      <section className="homeHeroCard2 discoveryHero21">
        <div>
          <span className="eyebrow2">HYRBART</span>
          <h2>{en ? 'The right gear for the next project' : 'Rätt prylar för nästa projekt'}</h2>
          <p>{en ? 'Quality products, ready when you need them.' : 'Kvalitetsprodukter, redo när du behöver dem.'}</p>
          <Link href={`/${locale}/produkter`} className="darkPillButton2">
            {en ? 'See all products' : 'Se alla produkter'} <ArrowIcon />
          </Link>
        </div>
        {featured[0] && (
          <div className="heroProduct2" aria-hidden="true">
            <ProductVisual kind="cleaner" accent={featured[0].accent} imageSrc={featured[0].image} imageAlt="" />
          </div>
        )}
      </section>

      <section className="homePopular2 discoveryPopular21">
        <div className="sectionHeading2">
          <h2>{en ? 'Popular right now' : 'Populärt just nu'}</h2>
          <Link href={`/${locale}/produkter`}>{en ? 'See all' : 'Visa alla'}</Link>
        </div>
        <div className="popularRail2 discoveryRail21">
          {featured.map((product) => (
            <Link key={product.slug} href={`/${locale}/produkter/${product.slug}`} className="popularCard2 discoveryPopularCard21">
              <div className="popularVisual2">
                <ProductVisual kind="cleaner" accent={product.accent} imageSrc={product.image} imageAlt={`${product.brand} ${product.name}`} />
              </div>
              <span className="discoveryType21">{en ? (product.typeEn ?? product.type) : product.type}</span>
              <strong>{product.brand} {product.name}</strong>
              <b>{formatPrice(product.price, en)}</b>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
