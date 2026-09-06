import Link from 'next/link';
import { products } from '@/lib/products';
import ProductVisual from '@/components/ProductVisual';

const categories = ['Alla', 'Rengöring', 'Sågning', 'Bygg', 'Bil & transport', 'Trädgård', 'Barn & familj'];

export default function ProductsPage() {
  return <div className="pageShell productsPage">
    <header className="pageHeader">
      <h1>PRODUKTER</h1>
      <p>Klicka på produkten för mer info och tips vid användning.</p>
    </header>

    <div className="chips productsChips" aria-label="Produktkategorier">
      {categories.map((category, index) =>
        <button key={category} className={index === 0 ? 'chip active' : 'chip'}>
          {category}
        </button>
      )}
    </div>

    <section className="productGrid productList">
      {products.map((product, index) =>
        <article className="productCard productListCard" key={product.slug}>
          <ProductVisual kind={index === 1 ? 'saw' : 'cleaner'} accent={product.accent}/>
          <div className="productCardContent">
            <div>
              <h2>{product.brand}<br/>{product.name}</h2>
              <p>{product.type}<br/>{product.price}</p>
            </div>
            <Link
              href={product.slug === 'karcher-se-3-compact' ? `/produkter/${product.slug}` : '#'}
              className="primaryButton compact"
            >
              Mer info
            </Link>
          </div>
        </article>
      )}
    </section>
  </div>;
}
