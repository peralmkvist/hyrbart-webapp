import Link from 'next/link';
import { getProducts } from '@/lib/sanity-products';
import ProductVisual from '@/components/ProductVisual';
import { ArrowIcon, CategoryIcon, SearchIcon } from '@/components/Icons';

const categories = [
  'Belysning',
  'Biltillbehör',
  'Borra & Skruva',
  'Foto & Teknik',
  'Hem & hushåll',
  'Håltagning',
  'Kontor',
  'Mäta',
  'Städa & Tvätta',
  'Såga & Slipa',
  'Trädgård',
];

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const en = locale === 'en';
  const products = await getProducts();
  const featured = [...products]
    .sort((a, b) => (b.reviewCount ?? 0) - (a.reviewCount ?? 0))
    .slice(0, 4);

  return (
    <div className="pageShell homePage2">
      <header className="brandHeader2" aria-label="Hyrbart">
        <Link href={`/${locale}`} className="hyrbartWordmark2">
          <span>Hyrbart</span>
          <i aria-hidden="true" />
        </Link>
      </header>

      <section className="homeIntro2">
        <h1>{en ? 'What do you want to rent?' : 'Vad vill du hyra?'}</h1>
        <Link href={`/${locale}/produkter`} className="searchField2 homeSearch2">
          <SearchIcon aria-hidden="true" />
          <span>{en ? 'Search product, category or use' : 'Sök produkt, kategori eller tillfälle'}</span>
        </Link>
      </section>

      <section className="homeCategories2" aria-label={en ? 'Categories' : 'Kategorier'}>
        {categories.map((category) => (
          <Link key={category} href={`/${locale}/produkter?category=${encodeURIComponent(category)}`}>
            <span className="categoryIconBubble2"><CategoryIcon category={category} /></span>
            <span>{category}</span>
          </Link>
        ))}
      </section>

      <section className="homeHeroCard2">
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
            <ProductVisual
              kind="cleaner"
              accent={featured[0].accent}
              imageSrc={featured[0].image}
              imageAlt=""
            />
          </div>
        )}
      </section>

      <section className="homePopular2">
        <div className="sectionHeading2">
          <h2>{en ? 'Popular right now' : 'Populärt just nu'}</h2>
          <Link href={`/${locale}/produkter`}>{en ? 'See all' : 'Visa alla'}</Link>
        </div>
        <div className="popularRail2">
          {featured.map((product) => (
            <Link key={product.slug} href={`/${locale}/produkter/${product.slug}`} className="popularCard2">
              <div className="popularVisual2">
                <ProductVisual
                  kind="cleaner"
                  accent={product.accent}
                  imageSrc={product.image}
                  imageAlt={`${product.brand} ${product.name}`}
                />
              </div>
              <strong>{product.brand} {product.name}</strong>
              <span>{en ? (product.typeEn ?? product.type) : product.type}</span>
              <b>{en ? product.price.replace('fr.', 'from') : product.price}</b>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
