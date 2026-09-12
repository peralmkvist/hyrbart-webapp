import { products as fallbackProducts, type Product } from '@/lib/products';

const projectId = 'djps09z6';
const dataset = 'production';
const apiVersion = '2026-09-08';
const hyrbartAccent = '#c6f000';

type SanityCrop = { top?: number; bottom?: number; left?: number; right?: number };
type SanityImage = { url?: string; crop?: SanityCrop; dimensions?: { width?: number; height?: number } };

const productProjection = `{
  "id": _id,
  brand,
  name,
  "slug": slug.current,
  typeSv,
  typeEn,
  category,
  dailyPrice,
  multiDayDiscountPercent,
  weeklyDiscountPercent,
  repeatCustomerDiscountPercent,
  "imageItems": images[]{
    "url": asset->url,
    crop,
    hotspot,
    "dimensions": asset->metadata.dimensions
  },
  "legacyImageUrl": image.asset->url,
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
  supplierUrl,
  "guideAvailable": count(guideSections) > 0,
  "owner": owner->{"id": _id, "name": displayName, city, "profileImage": profileImage.asset->url, responseTimeMinutes},
  "pickupLocation": pickupLocation->{"id": _id, name, city, area, "lat": location.lat, "lng": location.lng}
}`;

type SanityProduct = {
  id?: string; brand: string; name: string; slug: string; typeSv: string; typeEn?: string; category: string;
  dailyPrice?: number; multiDayDiscountPercent?: number; weeklyDiscountPercent?: number; repeatCustomerDiscountPercent?: number;
  imageItems?: SanityImage[]; legacyImageUrl?: string; legacyImagePath?: string; badge?: Product['badge']; rating?: number; reviewCount?: number;
  cardHighlight?: Product['cardHighlight']; rentalPrices?: Product['rentalPrices']; detailCategory?: Product['detailCategory']; included?: Product['included'];
  description?: Product['description']; specifications?: Product['specifications']; hyggloUrl?: string; supplierUrl?: string; guideAvailable?: boolean;
  owner?: Product['owner']; pickupLocation?: Product['pickupLocation'];
};

function croppedImageUrl(image?: SanityImage): string | undefined {
  if (!image?.url) return undefined;
  const { crop, dimensions } = image;
  const width = dimensions?.width; const height = dimensions?.height;
  if (!crop || !width || !height) return image.url;
  const left = Math.max(0, crop.left ?? 0); const right = Math.max(0, crop.right ?? 0); const top = Math.max(0, crop.top ?? 0); const bottom = Math.max(0, crop.bottom ?? 0);
  const x = Math.round(left * width); const y = Math.round(top * height);
  const rectWidth = Math.max(1, Math.round(width * (1 - left - right))); const rectHeight = Math.max(1, Math.round(height * (1 - top - bottom)));
  const url = new URL(image.url); url.searchParams.set('rect', `${x},${y},${rectWidth},${rectHeight}`); return url.toString();
}

function mapProduct(item: SanityProduct): Product {
  const legacyOneDayPrice = item.rentalPrices?.find((price) => price.days === 1)?.price;
  const oneDayPrice = item.dailyPrice ?? legacyOneDayPrice;
  const images = item.imageItems?.map(croppedImageUrl).filter((url): url is string => Boolean(url)) ?? [];
  const mainImage = images[0] || item.legacyImageUrl || item.legacyImagePath;
  return { id:item.id, slug:item.slug, brand:item.brand, name:item.name, type:item.typeSv, typeEn:item.typeEn,
    price:oneDayPrice ? `fr. ${oneDayPrice} kr/dygn` : '', dailyPrice:oneDayPrice,
    discounts:{ multiDayPercent:item.multiDayDiscountPercent, weeklyPercent:item.weeklyDiscountPercent, repeatCustomerPercent:item.repeatCustomerDiscountPercent },
    category:item.category, accent:hyrbartAccent, image:mainImage, images:images.length?images:mainImage?[mainImage]:undefined,
    badge:item.badge||undefined, rating:item.rating??undefined, reviewCount:item.reviewCount??undefined, cardHighlight:item.cardHighlight,
    rentalPrices:item.rentalPrices, detailCategory:item.detailCategory, included:item.included, description:item.description, specifications:item.specifications,
    guideAvailable:item.guideAvailable||undefined, hyggloUrl:item.hyggloUrl, supplierUrl:item.supplierUrl, owner:item.owner, pickupLocation:item.pickupLocation };
}

async function sanityQuery<T>(query: string): Promise<T> {
  const url = `https://${projectId}.api.sanity.io/v${apiVersion}/data/query/${dataset}?query=${encodeURIComponent(query)}`;
  const response = await fetch(url, { cache: 'no-store' });
  if (!response.ok) throw new Error(`Sanity request failed: ${response.status}`);
  const payload = (await response.json()) as { result: T }; return payload.result;
}

export async function getUnavailableProductSlugs(from?: string, to?: string): Promise<Set<string>> {
  if (!from) return new Set(); const end = to || from;
  try {
    const safeFrom = JSON.stringify(from); const safeEnd = JSON.stringify(end);
    const result = await sanityQuery<Array<{ slug?: string }>>(`*[_type == "availabilityBlock" && defined(product) && from <= ${safeEnd} && to >= ${safeFrom}]{"slug": product->slug.current}`);
    return new Set(result.map((item) => item.slug).filter((slug): slug is string => Boolean(slug)));
  } catch (error) { console.error('Could not load availability from Sanity. Treating products as available.', error); return new Set(); }
}

export async function getProducts(): Promise<Product[]> {
  try {
    const result = await sanityQuery<SanityProduct[]>(`*[_type == "product" && defined(slug.current) && (!defined(listingStatus) || listingStatus == "active")] ${productProjection}`);
    return result.length ? result.map(mapProduct) : fallbackProducts;
  } catch (error) { console.error('Could not load products from Sanity. Using local fallback.', error); return fallbackProducts; }
}

export async function getProduct(slug: string): Promise<Product | undefined> {
  try {
    const safeSlug = JSON.stringify(slug);
    const result = await sanityQuery<SanityProduct | null>(`*[_type == "product" && slug.current == ${safeSlug} && (!defined(listingStatus) || listingStatus == "active")][0] ${productProjection}`);
    return result ? mapProduct(result) : undefined;
  } catch (error) { console.error(`Could not load ${slug} from Sanity. Using local fallback.`, error); return fallbackProducts.find((product) => product.slug === slug); }
}
