'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import ProductVisual from './ProductVisual';
import { ProductBadgeLabel } from './ProductPricing';

type FavoriteProduct = {
  slug: string;
  brand: string;
  name: string;
  type: string;
  typeEn?: string;
  price: string;
  image?: string;
  accent?: string;
  badge?: 'popular'|'very-popular';
};

const FAVORITES_KEY = 'hyrbartFavorites';

function readFavorites(): string[] {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(FAVORITES_KEY) || '[]');
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === 'string') : [];
  } catch { return []; }
}

export default function FavoritesGrid({ locale, products }: { locale: string; products: FavoriteProduct[] }) {
  const en = locale === 'en';
  const [slugs, setSlugs] = useState<string[]>([]);

  useEffect(() => {
    const sync = () => setSlugs(readFavorites());
    sync();
    window.addEventListener('storage', sync);
    window.addEventListener('hyrbart:favorites-changed', sync);
    return () => {
      window.removeEventListener('storage', sync);
      window.removeEventListener('hyrbart:favorites-changed', sync);
    };
  }, []);

  const favorites = slugs.map(slug => products.find(product => product.slug === slug)).filter((product): product is FavoriteProduct => Boolean(product));

  if (!favorites.length) return <p className="ds2Intro">{en ? 'Products you save will appear here.' : 'Produkter du favoritmarkerar kommer att visas här.'}</p>;

  return <section className="productGrid2 favoritesGrid2">
    {favorites.map(product => <Link key={product.slug} href={`/${locale}/produkter/${product.slug}`} className="productTile2">
      <div className="productTileVisual2"><ProductVisual kind="cleaner" accent={product.accent} imageSrc={product.image} imageAlt={`${product.brand} ${product.name}`}/><ProductBadgeLabel badge={product.badge} locale={locale}/></div>
      <div className="productTileCopy2"><strong className="productTileTitle2"><span className="productTileBrand2">{product.brand}</span><span className="productTileName2">{product.name}</span></strong><span>{en ? (product.typeEn ?? product.type) : product.type}</span><b>{product.price}</b></div>
    </Link>)}
  </section>;
}
