import { products as fallbackProducts, type Product } from '@/lib/products';

const projectId = 'djps09z6';
const dataset = 'production';
const apiVersion = '2026-09-08';
const hyrbartAccent = '#c6f000';

const productProjection = `{
  brand,
  name,
  "slug": slug.current,
  typeSv,
  typeEn,
  category,
  "imageUrls": coalesce(images[].asset->url, select(defined(image.asset) => [image.asset->url], [])),
  "imageUrl": coalesce(images[0].asset->url, image.asset->url),
  legacyImagePath,
  badge,
  rating,
  reviewCount,
  cardHighlight{sv, en},
  rentalPrices[]{days, price},
  detailCategory{sv, en},
  included[]{sv, en},
  description{sv, en},
  specifications[]{label{sv, en}, value},
  hyggloUrl,
  "guideAvailable": count(guideSections) > 0
}`;

type SanityProduct = {
  brand: string;
  name: string;
  slug: string;
  typeSv: string;
  typeEn?: string;
  category: string;
  imageUrl?: string;
  imageUrls?: string[];
  legacyImagePath?: string;
  badge?: Product['badge'];
  rating?: number;
  reviewCount?: number;
  cardHighlight?: Product['cardHighlight'];
  rentalPrices?: Product['rentalPrices'];
  detailCategory?: Product['detailCategory'];
  included?: Product['included'];
  description?: Product['description'];
  specifications?: Product['specifications'];
  hyggloUrl?: string;
  guideAvailable?: boolean;
};

function mapProduct(item: SanityProduct): Product {
  const oneDayPrice = item.rentalPrices?.find((price) => price.days === 1)?.price;
  const images = item.imageUrls?.filter(Boolean) ?? [];
  const mainImage = images[0] || item.imageUrl || item.legacyImagePath;

  return {
    slug: item.slug,
    brand: item.brand,
    name: item.name,
    type: item.typeSv,
    typeEn: item.typeEn,
    price: oneDayPrice ? `fr. ${oneDayPrice} kr/dygn` : '',
    category: item.category,
    accent: hyrbartAccent,
    image: mainImage,
    images: images.length ? images : mainImage ? [mainImage] : undefined,
    badge: item.badge || undefined,
    rating: item.rating ?? undefined,
    reviewCount: item.reviewCount ?? undefined,
    cardHighlight: item.cardHighlight,
    rentalPrices: item.rentalPrices,
    detailCategory: item.detailCategory,
    included: item.included,
    description: item.description,
    specifications: item.specifications,
    guideAvailable: item.guideAvailable || undefined,
    hyggloUrl: item.hyggloUrl,
  };
}

async function sanityQuery<T>(query: string): Promise<T> {
  const url = `https://${projectId}.api.sanity.io/v${apiVersion}/data/query/${dataset}?query=${encodeURIComponent(query)}`;
  const response = await fetch(url, { cache: 'no-store' });

  if (!response.ok) throw new Error(`Sanity request failed: ${response.status}`);
  const payload = (await response.json()) as { result: T };
  return payload.result;
}

export async function getProducts(): Promise<Product[]> {
  try {
    const result = await sanityQuery<SanityProduct[]>(`*[_type == "product" && defined(slug.current)] ${productProjection}`);
    return result.length ? result.map(mapProduct) : fallbackProducts;
  } catch (error) {
    console.error('Could not load products from Sanity. Using local fallback.', error);
    return fallbackProducts;
  }
}

export async function getProduct(slug: string): Promise<Product | undefined> {
  try {
    const safeSlug = JSON.stringify(slug);
    const result = await sanityQuery<SanityProduct | null>(`*[_type == "product" && slug.current == ${safeSlug}][0] ${productProjection}`);
    return result ? mapProduct(result) : undefined;
  } catch (error) {
    console.error(`Could not load ${slug} from Sanity. Using local fallback.`, error);
    return fallbackProducts.find((product) => product.slug === slug);
  }
}
