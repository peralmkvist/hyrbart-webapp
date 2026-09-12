import Link from 'next/link';
import { getProducts } from '@/lib/sanity-products';
import ProductVisual from '@/components/ProductVisual';

function formatPrice(price: string, en: boolean) {
  if (!en) return price;
  return price.replace(/^fr\.\s*/i, 'from ').replace(/\s*kr\/dygn$/i, ' SEK/day');
}

export default async function HostListingsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const en = locale === 'en';
  const products = await getProducts();
  const sortedProducts = [...products].sort((a, b) => {
    const aType = en ? (a.typeEn ?? a.type) : a.type;
    const bType = en ? (b.typeEn ?? b.type) : b.type;
    return aType.localeCompare(bType, en ? 'en' : 'sv', { sensitivity: 'base' });
  });

  return (
    <section className="hostListingsPage">
      <header className="hostListingsHeader">
        <div>
          <h1>{en ? 'What do you want to rent out?' : 'Vad vill du hyra ut?'}</h1>
          <p>{en ? `${sortedProducts.length} active listings` : `${sortedProducts.length} aktiva annonser`}</p>
        </div>
      </header>

      <div className="hostListingsGrid">
        {sortedProducts.map((product) => (
          <Link href={`/topsecret/${locale}/produkter/${product.slug}`} className="hostListingCard" key={product.slug}>
            <div className="hostListingVisual">
              <ProductVisual
                kind="cleaner"
                accent={product.accent}
                imageSrc={product.image}
                imageAlt={`${product.brand} ${product.name}`}
              />
              <span className="hostListingStatus">{en ? 'Active' : 'Aktiv'}</span>
            </div>
            <div className="hostListingCopy">
              <span>{en ? (product.typeEn ?? product.type) : product.type}</span>
              <strong>{product.brand} {product.name}</strong>
              <b>{formatPrice(product.price, en)}</b>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
