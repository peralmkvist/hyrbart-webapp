import Link from 'next/link';
import { notFound } from 'next/navigation';
import ProductVisual from '@/components/ProductVisual';
import { products } from '@/lib/products';

export default async function GenericProductPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const product = products.find((item) => item.slug === slug);

  if (!product) notFound();

  const index = products.findIndex((item) => item.slug === slug);

  return (
    <div className="pageShell genericProductPage">
      <Link href="/produkter" className="backLink">← Produkter</Link>

      <div className="genericProductHero">
        <ProductVisual
          kind={index === 1 ? 'saw' : 'cleaner'}
          accent={product.accent}
        />

        <div className="productTitle">
          <p>{product.type}</p>
          <h1>{product.brand}<br />{product.name}</h1>
          <p>{product.price}</p>
        </div>
      </div>

      <div className="genericProductNotice">
        <strong>Mer produktinformation kommer här.</strong>
        <p>Vi bygger nu upp detaljsidan och användarguiden för den här produkten.</p>
      </div>
    </div>
  );
}
