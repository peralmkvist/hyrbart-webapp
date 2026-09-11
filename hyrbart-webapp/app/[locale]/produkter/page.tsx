import Link from 'next/link';
import { getProducts } from '@/lib/sanity-products';
import ProductVisual from '@/components/ProductVisual';
import { CategoryIcon, SearchIcon } from '@/components/Icons';

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

function normalize(value: string | undefined) {
  return (value ?? '').trim().toLocaleLowerCase('sv');
}

export default async function ProductsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ category?: string; q?: string }>;
}) {
  const { locale } = await params;
  const { category, q } = await searchParams;
  const en = locale === 'en';
  const products = await getProducts();
  const selectedCategory = categoryDefinitions.some((item) => item.value === category) ? category : undefined;
  const query = normalize(q);

  const filteredProducts = products.filter((product) => {
    if (selectedCategory && product.category !== selectedCategory) return false;
    if (!query) return true;

    const categoryLabel = categoryDefinitions.find((item) => item.value === product.category);
    const searchable = [
      product.brand,
      product.name,
      product.type,
      product.typeEn,
      product.category,
      categoryLabel?.sv,
      categoryLabel?.en,
    ].map(normalize).join(' ');

    return searchable.includes(query);
  });

  const sortedProducts = [...filteredProducts].sort((a, b) => {
    const aType = en ? (a.typeEn ?? a.type) : a.type;
    const bType = en ? (b.typeEn ?? b.type) : b.type;
    return aType.localeCompare(bType, en ? 'en' : 'sv', { sensitivity: 'base' });
  });

  const buildCategoryHref = (value?: string) => {
    const params = new URLSearchParams();
    if (value) params.set('category', value);
    if (q?.trim()) params.set('q', q.trim());
    const suffix = params.toString();
    return `/${locale}/produkter${suffix ? `?${suffix}` : ''}`;
  };

  return (
    <div className="pageShell rentPage2 discoveryRent21">
      <header className="rentHeader2 discoveryRentHeader21">
        <h1>{en ? 'Rent' : 'Hyra'}</h1>
      </header>

      <form action={`/${locale}/produkter`} method="get" className="searchField2 discoverySearch21 discoveryRentSearch21" role="search">
        <SearchIcon aria-hidden="true" />
        <input
          type="search"
          name="q"
          defaultValue={q ?? ''}
          enterKeyHint="search"
          autoComplete="off"
          aria-label={en ? 'Search products' : 'Sök produkter'}
          placeholder={en ? 'Search product, category or use' : 'Sök produkt, kategori eller tillfälle'}
        />
        {selectedCategory && <input type="hidden" name="category" value={selectedCategory} />}
        <button type="submit">{en ? 'Search' : 'Sök'}</button>
      </form>

      <div className="categoryStrip2 discoveryCategoryStrip21" aria-label={en ? 'Product categories' : 'Produktkategorier'}>
        <Link href={buildCategoryHref()} className={!selectedCategory ? 'categoryChip2 active' : 'categoryChip2'}>
          {en ? 'All' : 'Alla'}
        </Link>
        {categoryDefinitions.map((item) => (
          <Link
            key={item.value}
            href={buildCategoryHref(item.value)}
            className={selectedCategory === item.value ? 'categoryChip2 active' : 'categoryChip2'}
          >
            {en ? item.en : item.sv}
          </Link>
        ))}
      </div>

      <div className="rentMeta2 discoveryMeta21">
        <span>{sortedProducts.length} {en ? 'products' : 'produkter'}</span>
        {(selectedCategory || query) && (
          <Link href={`/${locale}/produkter`}>{en ? 'Clear filters' : 'Rensa filter'}</Link>
        )}
      </div>

      {sortedProducts.length > 0 ? (
        <section className="productGrid2 discoveryGrid21">
          {sortedProducts.map((product) => (
            <Link
              href={`/${locale}/produkter/${product.slug}`}
              className="productTile2 discoveryTile21"
              key={product.slug}
              aria-label={`${product.brand} ${product.name}`}
            >
              <div className="productTileVisual2 discoveryTileVisual21">
                <ProductVisual kind="cleaner" accent={product.accent} imageSrc={product.image} imageAlt={`${product.brand} ${product.name}`} />
              </div>
              <div className="productTileCopy2 discoveryTileCopy21">
                <span className="discoveryType21">{en ? (product.typeEn ?? product.type) : product.type}</span>
                <strong>{product.brand} {product.name}</strong>
                <b>{formatPrice(product.price, en)}</b>
              </div>
            </Link>
          ))}
        </section>
      ) : (
        <section className="discoveryEmpty21">
          <h2>{en ? 'No matches' : 'Inga träffar'}</h2>
          <p>{en ? 'Try another search or clear the filters.' : 'Testa en annan sökning eller rensa filtren.'}</p>
          <Link href={`/${locale}/produkter`}>{en ? 'Show all products' : 'Visa alla produkter'}</Link>
        </section>
      )}

      {!selectedCategory && !query && (
        <section className="categoryOverview2 discoveryCategoryOverview21" aria-label={en ? 'All categories' : 'Alla kategorier'}>
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
