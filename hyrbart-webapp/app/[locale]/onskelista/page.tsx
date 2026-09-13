import { getProducts } from '@/lib/sanity-products';
import FavoritesGrid from '@/components/FavoritesGrid';

export default async function WishlistPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const products = await getProducts();
  const cards = products.map(product => ({
    slug: product.slug,
    brand: product.brand,
    name: product.name,
    type: product.type,
    typeEn: product.typeEn,
    price: product.price,
    image: product.image,
    accent: product.accent,
    badge: product.badge,
  }));
  return <section className="ds2Page favoritesPage2"><FavoritesGrid locale={locale} products={cards}/></section>;
}
