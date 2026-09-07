import Link from 'next/link';
import { products } from '@/lib/products';
import ProductVisual from '@/components/ProductVisual';
import { ProductBadgeLabel, RentalPriceGrid } from '@/components/ProductPricing';

const svCategories = ['Alla', 'Rengöring', 'Sågning', 'Bygg', 'Bil & transport', 'Trädgård', 'Barn & familj'];
const enCategories = ['All', 'Cleaning', 'Sawing', 'Construction', 'Car & transport', 'Garden', 'Children & family'];

const typeEn: Record<string, string> = {
  'Textiltvätt': 'Carpet & upholstery cleaner',
  'Kap-/gersåg': 'Mitre saw',
  'Takbox': 'Roof box',
  'Grovdamm­sugare': 'Wet & dry vacuum',
};

export default async function ProductsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const en = locale === 'en';
  const categories = en ? enCategories : svCategories;

  return (
    <div className="pageShell productsPage">
      <div className="chips productsChips" aria-label={en ? 'Product categories' : 'Produktkategorier'}>
        {categories.map((category, index) => (
          <button key={category} className={index === 0 ? 'chip active' : 'chip'}>
            {category}
          </button>
        ))}
      </div>

      <section className="productGrid productList">
        {products.map((product, index) => (
          <Link
            href={`/${locale}/produkter/${product.slug}`}
            className="productCard productListCard productCardLink"
            key={product.slug}
            aria-label={`${product.brand} ${product.name}`}
          >
            <div className="productCardVisualWrap">
              <ProductVisual
                kind={index === 1 ? 'saw' : 'cleaner'}
                accent={product.accent}
                imageSrc={product.image}
                imageAlt={`${product.brand} ${product.name}`}
              />
              <ProductBadgeLabel badge={product.badge} locale={locale} />
            </div>

            <div className="productCardContent">
              <div>
                <p className="productCardType">
                  {en ? (typeEn[product.type] ?? product.type) : product.type}
                </p>

                <h2>{product.brand}<br />{product.name}</h2>

                {product.rentalPrices?.length ? (
                  <RentalPriceGrid prices={product.rentalPrices} locale={locale} compact />
                ) : (
                  <p className="productCardPrice">
                    {en ? product.price.replace('fr.', 'from') : product.price}
                  </p>
                )}
              </div>

              <span className="primaryButton compact productCardCta" aria-hidden="true">
                {en ? 'More info' : 'Mer info'}
              </span>
            </div>
          </Link>
        ))}
      </section>
    </div>
  );
}
