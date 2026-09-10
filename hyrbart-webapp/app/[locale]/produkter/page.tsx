import Link from 'next/link';
import { getProducts } from '@/lib/sanity-products';
import ProductVisual from '@/components/ProductVisual';
import { ProductBadgeLabel, RentalPriceGrid } from '@/components/ProductPricing';

const categoryDefinitions = [
  { value: 'Belysning', sv: 'Belysning', en: 'Lighting' },
  { value: 'Barnartiklar', sv: 'Barnartiklar', en: 'Children’s items' },
  { value: 'Biltillbehör', sv: 'Biltillbehör', en: 'Car accessories' },
  { value: 'Borra & Skruva', sv: 'Borra & Skruva', en: 'Drilling & Screwdriving' },
  { value: 'Handverktyg', sv: 'Handverktyg', en: 'Hand tools' },
  { value: 'Hem & hushåll', sv: 'Hem & hushåll', en: 'Home & household' },
  { value: 'Håltagning', sv: 'Håltagning', en: 'Hole making' },
  { value: 'Kontor', sv: 'Kontor', en: 'Office' },
  { value: 'Luftverktyg', sv: 'Luftverktyg', en: 'Pneumatic tools' },
  { value: 'Mäta', sv: 'Mäta', en: 'Measuring' },
  { value: 'Städa & Tvätta', sv: 'Städa & Tvätta', en: 'Cleaning & Washing' },
  { value: 'Såga & Slipa', sv: 'Såga & Slipa', en: 'Sawing & Sanding' },
  { value: 'Trädgård', sv: 'Trädgård', en: 'Garden' },
  { value: 'Värme', sv: 'Värme', en: 'Heating' },
];

function ProductRating({
  rating,
  reviewCount,
}: {
  rating?: number;
  reviewCount?: number;
}) {
  if (rating == null || reviewCount == null) return null;

  return (
    <div className="productCardRating" aria-label={`${rating} av 5, ${reviewCount} omdömen`}>
      <span className="ratingStar" aria-hidden="true">★</span>
      <strong>{rating.toFixed(1).replace('.', ',')}</strong>
      <span>({reviewCount})</span>
    </div>
  );
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
  const selectedCategory = categoryDefinitions.some((item) => item.value === category)
    ? category
    : undefined;
  const filteredProducts = selectedCategory
    ? products.filter((product) => product.category === selectedCategory)
    : products;
  const sortedProducts = [...filteredProducts].sort((a, b) => {
    const aType = en ? (a.typeEn ?? a.type) : a.type;
    const bType = en ? (b.typeEn ?? b.type) : b.type;
    return aType.localeCompare(bType, en ? 'en' : 'sv', { sensitivity: 'base' });
  });

  return (
    <div className="pageShell productsPage">
      <div className="chips productsChips" aria-label={en ? 'Product categories' : 'Produktkategorier'}>
        <Link
          href={`/${locale}/produkter`}
          className={!selectedCategory ? 'chip active' : 'chip'}
        >
          {en ? 'All' : 'Alla'}
        </Link>

        {categoryDefinitions.map((item) => (
          <Link
            key={item.value}
            href={`/${locale}/produkter?category=${encodeURIComponent(item.value)}`}
            className={selectedCategory === item.value ? 'chip active' : 'chip'}
          >
            {en ? item.en : item.sv}
          </Link>
        ))}
      </div>

      <section className="productGrid productList">
        {sortedProducts.map((product) => {
          const highlight = en ? product.cardHighlight?.en : product.cardHighlight?.sv;

          return (
            <Link
              href={`/${locale}/produkter/${product.slug}`}
              className="productCard productListCard productCardLink"
              key={product.slug}
              aria-label={`${product.brand} ${product.name}`}
            >
              <div className="productCardVisualWrap">
                <ProductVisual
                  kind="cleaner"
                  accent={product.accent}
                  imageSrc={product.image}
                  imageAlt={`${product.brand} ${product.name}`}
                />
                <ProductBadgeLabel badge={product.badge} locale={locale} />
                <ProductRating
                  rating={product.rating}
                  reviewCount={product.reviewCount}
                />
              </div>

              <div className="productCardContent">
                <div>
                  <p className="productCardType">
                    {en ? (product.typeEn ?? product.type) : product.type}
                  </p>

                  <h2>{product.brand}<br />{product.name}</h2>

                  <p
                    className="productCardType"
                    aria-hidden={!highlight}
                    style={{
                      color: 'var(--ink)',
                      visibility: highlight ? 'visible' : 'hidden',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {highlight || '\u00a0'}
                  </p>
                </div>

                <div style={{ marginTop: 'auto' }}>
                  {product.rentalPrices?.length ? (
                    <RentalPriceGrid prices={product.rentalPrices} locale={locale} compact />
                  ) : (
                    <p className="productCardPrice">
                      {en ? product.price.replace('fr.', 'from') : product.price}
                    </p>
                  )}

                  <span className="primaryButton compact productCardCta" aria-hidden="true">
                    {en ? 'More info' : 'Mer info'}
                  </span>
                </div>
              </div>
            </Link>
          );
        })}
      </section>
    </div>
  );
}
