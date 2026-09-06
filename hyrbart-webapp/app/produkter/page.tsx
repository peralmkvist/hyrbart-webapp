import Link from 'next/link';
import { products } from '@/lib/products';
import ProductVisual from '@/components/ProductVisual';

const categories = ['Alla', 'Rengöring', 'Sågning', 'Bygg', 'Bil & transport', 'Trädgård', 'Barn & familj'];

export default function ProductsPage() {
  return <div className="pageShell productsPage">
    <header className="pageHeader"><h1>PRODUKTER</h1><p>Klicka på produkten för mer info och tips vid användning.</p></header>
    <div className="chips">{categories.map((c,i)=><button key={c} className={i===0?'chip active':'chip'}>{c}</button>)}</div>
    <section className="productGrid">
      {products.map((p, idx) => <article className="productCard" key={p.slug}>
        <ProductVisual kind={idx===1?'saw':'cleaner'} accent={p.accent}/>
        <h2>{p.brand}<br/>{p.name}</h2><p>{p.type}<br/>{p.price}</p>
        <Link href={p.slug==='karcher-se-3-compact'?`/produkter/${p.slug}`:'#'} className="primaryButton compact">Mer info</Link>
      </article>)}
    </section>
  </div>;
}
