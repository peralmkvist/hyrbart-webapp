import Link from 'next/link';
import { notFound } from 'next/navigation';
import ProductVisual from '@/components/ProductVisual';
import { products } from '@/lib/products';

export default async function GenericProductPage({ params }: { params: Promise<{ locale: string; slug: string }> }) {
  const { locale, slug } = await params;
  const en = locale === 'en';
  const product = products.find(item => item.slug === slug);
  if (!product) notFound();
  const index = products.findIndex(item => item.slug === slug);
  return <div className="pageShell genericProductPage">
    <Link href={`/${locale}/produkter`} className="backLink">← {en ? 'Products' : 'Produkter'}</Link>
    <div className="genericProductHero"><ProductVisual kind={index === 1 ? 'saw' : 'cleaner'} accent={product.accent} /><div className="productTitle"><p>{product.type}</p><h1>{product.brand}<br />{product.name}</h1><p>{product.price}</p></div></div>
    <div className="genericProductNotice"><strong>{en ? 'More product information is coming.' : 'Mer produktinformation kommer här.'}</strong><p>{en ? 'We are building the product detail page and user guide.' : 'Vi bygger nu upp detaljsidan och användarguiden för den här produkten.'}</p></div>
  </div>;
}
