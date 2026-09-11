import Link from 'next/link';
import { getProducts } from '@/lib/sanity-products';
import ProductVisual from '@/components/ProductVisual';
import { CategoryIcon, SearchIcon } from '@/components/Icons';

const categoryDefinitions = [
  { value: 'Belysning', sv: 'Belysning', en: 'Lighting' },
  { value: 'Biltillbehör', sv: 'Biltillbehör', en: 'Car accessories' },
  { value: 'Borra & Skruva', sv: 'Borra & Skruva', en: 'Drilling & screwdriving' },
  { value: 'Foto & Teknik', sv: 'Foto & Teknik', en: 'Photo & tech' },
  { value: 'Hem & hushåll', sv: 'Hem & hushåll', en: 'Home & household' },
  { value: 'Håltagning', sv: 'Håltagning', en: 'Hole making' },
  { value: 'Kontor', sv: 'Kontor', en: 'Office' },
  { value: 'Mäta', sv: 'Mäta', en: 'Measuring' },
  { value: 'Städa & Tvätta', sv: 'Städa & Tvätta', en: 'Cleaning & washing' },
  { value: 'Såga & Slipa', sv: 'Såga & Slipa', en: 'Sawing & sanding' },
  { value: 'Trädgård', sv: 'Trädgård', en: 'Garden' },
];

function formatPrice(price: string, en: boolean) {
  if (!en) return price;
  return price.replace(/^fr\.\s*/i, 'from ').replace(/\s*kr\/dygn$/i, ' SEK/day');
}

export default async function ProductsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ category?: string }>;
}) {
  const { locale } = await params;
  const { category } = await searchParams;
  const en = locale === 'en';
  const products = await getProducts();
  const selectedCategory = categoryDefinitions.some((item) => item.value === category) ? category : undefined;
  const filteredProducts = selectedCategory ? products.filter((product) => product.category === selectedCategory) : products;
  const sortedProducts = [...filteredProducts].sort((a, b) => {
    const aType = en ? (a.typeEn ?? a.type) : a.type;
    const bType = en ? (b.typeEn ?? b.type) : b.type;
    return aType.localeCompare(bType, en ? 'en' : 'sv', { sensitivity: 'base' });
  });

  return (
    <div className="pageShell rentPage2">
      <header className="rentHeader2">
        <h1>{en ? 'Rent' : 'Hyra'}</h1>
        <Link className="roundIconButton" href={`/${locale}/produkter`} aria-label={en ? 'Search products' : 'Sök produkter'}>
          <SearchIcon />
        </Link>
      </header>

      <div className="searchField2" role="search">
        <SearchIcon aria-hidden="true" />
        <span>{en ? 'Search product, category or use' : 'Sök produkt, kategori eller tillfälle'}</span>
      </div>

      <div className="categoryStrip2" aria-label={en ? 'Product categories' : 'Produktkategorier'}>
        <Link href={`/${locale}/produkter`} className={!selectedCategory ? 'categoryChip2 active' : 'categoryChip2'}>
          {en ? 'All' : 'Alla'}
        </Link>
        {categoryDefinitions.map((item) => (
          <Link
            key={item.value}
            href={`/${locale}/produkter?category=${encodeURIComponent(item.value)}`}
            className={selectedCategory === item.value ? 'categoryChip2 active' : 'categoryChip2'}
          >
            {en ? item.en : item.sv}
          </Link>
        ))}
      </div>

      <div className="rentMeta2">
        <span>{sortedProducts.length} {en ? 'products' : 'produkter'}</span>
        <span>{en ? 'Sorted A–Z' : 'Sorterat A–Ö'}</span>
      </div>

      <section className="productGrid2">
        {sortedProducts.map((product) => (
          <Link
            href={`/${locale}/produkter/${product.slug}`}
            className="productTile2"
            key={product.slug}
            aria-label={`${product.brand} ${product.name}`}
          >
            <div className="productTileVisual2">
              <ProductVisual
                kind="cleaner"
                accent={product.accent}
                imageSrc={product.image}
                imageAlt={`${product.brand} ${product.name}`}
              />
            </div>
            <div className="productTileCopy2">
              <strong>{product.brand} {product.name}</strong>
              <span>{en ? (product.typeEn ?? product.type) : product.type}</span>
              <b>{formatPrice(product.price, en)}</b>
            </div>
          </Link>
        ))}
      </section>

      {!selectedCategory && (
        <section className="categoryOverview2" aria-label={en ? 'All categories' : 'Alla kategorier'}>
          {categoryDefinitions.map((item) => (
            <Link key={item.value} href={`/${locale}/produkter?category=${encodeURIComponent(item.value)}`}>
              <CategoryIcon category={item.value} />
              <span>{en ? item.en : item.sv}</span>
            </Link>
          ))}
        </section>
      )}
    </div>
  );
}
