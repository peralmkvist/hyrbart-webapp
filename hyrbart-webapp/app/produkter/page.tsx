import Link from 'next/link';
import { products } from '@/lib/products';
import ProductVisual from '@/components/ProductVisual';

const categories = ['Alla', 'Rengöring', 'Sågning', 'Bygg', 'Bil & transport', 'Trädgård', 'Barn & familj'];

export default function ProductsPage() {
  return (
    <div className="pageShell productsPage">
      <div className="chips productsChips" aria-label="Produktkategorier">
        {categories.map((category, index) => (
          <button key={category} className={index === 0 ? 'chip active' : 'chip'}>
            {category}
          </button>
        ))}
      </div>

      <section className="productGrid productList">
        {products.map((product, index) => (
          <Link
            href={`/produkter/${product.slug}`}
            className="productCard productListCard productCardLink"
            key={product.slug}
            aria-label={`${product.brand} ${product.name} – mer info`}
          >
            <ProductVisual
              kind={index === 1 ? 'saw' : 'cleaner'}
              accent={product.accent}
            />

            <div className="productCardContent">
              <div>
                <h2>{product.brand}<br />{product.name}</h2>
                <p>{product.type}<br />{product.price}</p>
              </div>

              <span className="primaryButton compact productCardCta" aria-hidden="true">
                Mer info
              </span>
            </div>
          </Link>
        ))}
      </section>
    </div>
  );
}
