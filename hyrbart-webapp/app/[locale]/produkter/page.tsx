import Link from 'next/link';
import { getProducts, getUnavailableProductSlugs } from '@/lib/sanity-products';
import { getUnavailableProductIds } from '@/lib/supabase-bookings';
import { getProductReviewSummaries } from '@/lib/review-summaries';
import { distanceKm, geocodeSwedishPlace } from '@/lib/geo';
import { calculateRentalPricing } from '@/lib/rental-pricing';
import { DISCOVERY_ROOTS, categoryBelongsToRoot, categoryIntegrity, categorySearchTerms, rootLabel } from '@/lib/discovery-taxonomy';
import ProductVisual from '@/components/ProductVisual';
import ProductSearchForm from '@/components/ProductSearchForm';
import SearchFilters from '@/components/SearchFilters';
import SearchResults from '@/components/SearchResults';
import { ProductBadgeLabel } from '@/components/ProductPricing';
import { CategoryIcon } from '@/components/Icons';

function normalize(v: string | undefined) {
  return (v ?? '').trim().toLocaleLowerCase('sv-SE');
}

function hasDiscount(product: { discounts?: { multiDayPercent?: number; weeklyPercent?: number; repeatCustomerPercent?: number } }) {
  return Boolean(
    (product.discounts?.multiDayPercent ?? 0) > 0 ||
    (product.discounts?.weeklyPercent ?? 0) > 0 ||
    (product.discounts?.repeatCustomerPercent ?? 0) > 0
  );
}

type SearchParams = {
  category?: string;
  q?: string;
  from?: string;
  to?: string;
  place?: string;
  radius?: string;
  nearby?: string;
  edit?: string;
  maxPrice?: string;
  minRating?: string;
  discountOnly?: string;
};

export default async function ProductsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<SearchParams>;
}) {
  const { locale } = await params;
  const sp = await searchParams;
  const { category, q, from, to, place, radius, nearby, edit, maxPrice, minRating, discountOnly } = sp;
  const en = locale === 'en';
  const products = await getProducts();
  const reviewSummaries = await getProductReviewSummaries(products.flatMap(p => p.id ? [p.id] : []));

  const selectedCategory = DISCOVERY_ROOTS.includes(category || '') ? category : undefined;
  const query = normalize(q);
  const requestedFrom = from || to;
  const requestedTo = to || from;
  const parsedMaxPrice = Math.max(0, Number(maxPrice || 0) || 0);
  const parsedMinRating = Math.max(0, Math.min(5, Number(minRating || 0) || 0));
  const onlyDiscounted = discountOnly === '1';

  const integrity = categoryIntegrity(products.map(p => p.category));
  if (integrity.unknown.length) console.warn('Discovery found unmapped product categories', integrity.unknown);

  const [legacyUnavailableSlugs, bookedProductIds] = requestedFrom
    ? await Promise.all([
        getUnavailableProductSlugs(requestedFrom, requestedTo),
        getUnavailableProductIds(requestedFrom, requestedTo),
      ])
    : [new Set<string>(), new Set<string>()];

  const unavailableSlugs = new Set<string>(legacyUnavailableSlugs);
  for (const product of products) {
    if (product.id && bookedProductIds.has(product.id)) unavailableSlugs.add(product.slug);
  }

  const searched = Boolean(
    query || from || to || place || nearby === '1' || selectedCategory || parsedMaxPrice || parsedMinRating || onlyDiscounted || (radius && radius !== '10')
  );
  const locationRequested = Boolean(place || nearby === '1');
  const searchPlace = place?.trim() || 'Danderyd';
  const searchRadius = Math.max(1, Math.min(50, Number(radius || 10) || 10));
  const searchCenter = locationRequested ? await geocodeSwedishPlace(searchPlace) : null;

  const filtered = products
    .filter(product => {
      if (selectedCategory && !categoryBelongsToRoot(product.category, selectedCategory)) return false;

      if (query) {
        const terms = [
          product.brand,
          product.name,
          product.type,
          product.typeEn,
          product.category,
          ...categorySearchTerms(product.category),
        ].map(normalize).join(' ');
        if (!terms.includes(query)) return false;
      }

      if (requestedFrom && unavailableSlugs.has(product.slug)) return false;

      if (locationRequested && searchCenter) {
        const point = product.pickupLocation;
        if (!point) return false;
        if (distanceKm(searchCenter, { lat: point.lat, lng: point.lng }) > searchRadius) return false;
      }

      if (parsedMaxPrice > 0) {
        const pricing = requestedFrom
          ? calculateRentalPricing(product.price, requestedFrom, requestedTo || requestedFrom, product.rentalPrices, product.discounts)
          : null;
        const totalPrice = pricing?.total ?? product.dailyPrice;
        if (totalPrice == null || totalPrice > parsedMaxPrice) return false;
      }

      if (parsedMinRating > 0) {
        const review = product.id ? reviewSummaries[product.id] : undefined;
        if (!review?.count || review.overall == null || review.overall < parsedMinRating) return false;
      }

      if (onlyDiscounted && !hasDiscount(product)) return false;

      return true;
    })
    .sort((a, b) => {
      if (searchCenter && a.pickupLocation && b.pickupLocation) {
        const da = distanceKm(searchCenter, { lat: a.pickupLocation.lat, lng: a.pickupLocation.lng });
        const db = distanceKm(searchCenter, { lat: b.pickupLocation.lat, lng: b.pickupLocation.lng });
        if (Math.abs(da - db) > 0.01) return da - db;
      }
      return (en ? (a.typeEn ?? a.type) : a.type).localeCompare(en ? (b.typeEn ?? b.type) : b.type, en ? 'en' : 'sv', { sensitivity: 'base' });
    });

  const rootCounts = new Map(DISCOVERY_ROOTS.map(root => [root, products.filter(p => categoryBelongsToRoot(p.category, root)).length]));
  const categoryOptions = DISCOVERY_ROOTS.map(root => ({ value: root, label: rootLabel(root, locale) }));

  const appendFilterParams = (params: URLSearchParams) => {
    if (maxPrice) params.set('maxPrice', maxPrice);
    if (minRating) params.set('minRating', minRating);
    if (onlyDiscounted) params.set('discountOnly', '1');
  };

  const keep = (value?: string) => {
    const params = new URLSearchParams();
    if (value) params.set('category', value);
    if (q) params.set('q', q);
    if (from) params.set('from', from);
    if (to) params.set('to', to);
    if (place) params.set('place', place);
    if (radius) params.set('radius', radius);
    if (nearby === '1') params.set('nearby', '1');
    appendFilterParams(params);
    return `/${locale}/produkter?${params}`;
  };

  const buildProductQuery = () => {
    const params = new URLSearchParams();
    if (q) params.set('q', q);
    if (selectedCategory) params.set('category', selectedCategory);
    if (from) params.set('from', from);
    if (to) params.set('to', to);
    if (place) params.set('place', place);
    if (radius) params.set('radius', radius);
    if (nearby === '1') params.set('nearby', '1');
    appendFilterParams(params);
    return params;
  };

  const resultItems = filtered.map(product => {
    const pricing = from ? calculateRentalPricing(product.price, from, to || from, product.rentalPrices, product.discounts) : null;
    const qp = buildProductQuery();
    const point = product.pickupLocation;
    const distance = searchCenter && point ? distanceKm(searchCenter, { lat: point.lat, lng: point.lng }) : undefined;
    const review = product.id ? reviewSummaries[product.id] : undefined;
    return {
      slug: product.slug,
      href: `/${locale}/produkter/${product.slug}${searched ? `?${qp.toString()}` : ''}`,
      brand: product.brand,
      name: product.name,
      type: en ? (product.typeEn ?? product.type) : product.type,
      image: product.image,
      accent: product.accent,
      badge: product.badge,
      priceLabel: pricing ? `${pricing.total} kr · ${pricing.days} ${en ? (pricing.days === 1 ? 'day' : 'days') : (pricing.days === 1 ? 'dag' : 'dagar')}` : product.price,
      mapLabel: pricing ? `${pricing.total} kr` : product.price,
      lat: point?.lat,
      lng: point?.lng,
      distanceKm: distance,
      rating: review?.overall,
      reviewCount: review?.count || 0,
    };
  });

  const metaLabel = `${filtered.length} ${en ? 'products' : 'produkter'}`;
  const locationUnavailable = locationRequested && !searchCenter;
  const categoryEmpty = Boolean(selectedCategory) && !products.some(p => categoryBelongsToRoot(p.category, selectedCategory));

  const productGrid = (
    <>
      <section className="productGrid2">
        {filtered.map(product => {
          const review = product.id ? reviewSummaries[product.id] : undefined;
          const qp = buildProductQuery();
          return (
            <Link href={`/${locale}/produkter/${product.slug}${searched ? `?${qp.toString()}` : ''}`} className="productTile2" key={product.slug}>
              <div className="productTileVisual2">
                <ProductVisual kind="cleaner" accent={product.accent} imageSrc={product.image} imageAlt={`${product.brand} ${product.name}`} />
                <ProductBadgeLabel badge={product.badge} locale={locale} />
              </div>
              <div className="productTileCopy2">
                <strong className="productTileTitle2">
                  <span className="productTileBrand2">{product.brand}</span>
                  <span className="productTileName2">{product.name}</span>
                </strong>
                <span>{en ? (product.typeEn ?? product.type) : product.type}</span>
                {review?.count && review.overall != null ? (
                  <span className="productReviewMini2">★ {review.overall.toFixed(1).replace('.', ',')} · {review.count} {en ? 'reviews' : 'omdömen'}</span>
                ) : null}
                <b>{product.price}</b>
              </div>
            </Link>
          );
        })}
      </section>
    </>
  );

  return (
    <div className="pageShell rentPage2">
      <div className="rentSticky2">
        <header className="brandHeader2">
          <Link href={`/${locale}`} className="hyrbartWordmark2"><span className="hyrbartWordmarkH2">H<i /></span><span>yrbart</span></Link>
        </header>
        <section className="homeIntro2 rentIntro2">
          <h1>{en ? 'What do you want to rent?' : 'Vad vill du hyra?'}</h1>
          <ProductSearchForm
            locale={locale}
            initialQuery={q ?? ''}
            category={selectedCategory}
            initialFrom={from ?? ''}
            initialTo={to ?? ''}
            initialPlace={place ?? ''}
            initialRadius={radius ?? '10'}
            initialNearby={nearby === '1'}
            initiallyCollapsed={searched && edit !== '1'}
          />
        </section>
        <div className="categoryStrip2">
          <Link href={keep()} className={!selectedCategory ? 'categoryChip2 active' : 'categoryChip2'}>{en ? 'All' : 'Alla'}</Link>
          {DISCOVERY_ROOTS.map(root => (
            <Link key={root} href={keep(root)} className={selectedCategory === root ? 'categoryChip2 active' : 'categoryChip2'}>
              {rootLabel(root, locale)}{rootCounts.get(root) ? <small> {rootCounts.get(root)}</small> : null}
            </Link>
          ))}
        </div>
      </div>

      <SearchFilters
        locale={locale}
        query={q}
        from={from}
        to={to}
        place={place}
        nearby={nearby === '1'}
        category={selectedCategory}
        radius={radius ?? '10'}
        maxPrice={maxPrice}
        minRating={minRating}
        discountOnly={onlyDiscounted}
        categories={categoryOptions}
        resultCount={filtered.length}
      />

      {locationUnavailable ? (
        <section className="rentEmpty2">
          <h2>{en ? 'Location not found' : 'Platsen hittades inte'}</h2>
          <p>{en ? 'Try a city, district or postcode in Sweden.' : 'Testa en ort, stadsdel eller ett postnummer i Sverige.'}</p>
          <Link href={`/${locale}/produkter?edit=1`}>{en ? 'Edit search' : 'Ändra sökning'}</Link>
        </section>
      ) : filtered.length ? (
        searchCenter ? (
          <SearchResults
            locale={locale}
            place={nearby === '1' ? (en ? 'Nearby' : 'I närheten') : searchPlace}
            radius={searchRadius}
            center={searchCenter}
            items={resultItems}
            metaLabel={metaLabel}
          />
        ) : productGrid
      ) : (
        <section className="rentEmpty2">
          <h2>{categoryEmpty ? (en ? 'Nothing listed here yet' : 'Inget uthyrt här ännu') : (en ? 'No matches' : 'Inga träffar')}</h2>
          <p>
            {categoryEmpty
              ? (en ? 'This category is ready, but does not have active listings yet. Explore all categories instead.' : 'Kategorin finns, men har inga aktiva annonser ännu. Utforska alla kategorier i stället.')
              : requestedFrom
                ? (en ? 'No available products match your dates and filters. Try other dates or a larger radius.' : 'Inga lediga produkter matchar dina datum och filter. Prova andra datum eller större radie.')
                : searchCenter
                  ? (en ? `No products found within ${searchRadius} km. Try a larger radius or another location.` : `Inga produkter hittades inom ${searchRadius} km. Prova större radie eller en annan plats.`)
                  : (en ? 'Try removing one or more filters.' : 'Prova att ta bort ett eller flera filter.')}
          </p>
          <Link href={`/${locale}/produkter?edit=1`}>{en ? 'Change search' : 'Ändra sökning'}</Link> · <Link href={`/${locale}/produkter`}>{en ? 'Show all' : 'Visa alla'}</Link>
        </section>
      )}

      {!selectedCategory && !query && !searched ? (
        <section className="categoryOverview2">
          {DISCOVERY_ROOTS.map(root => (
            <Link key={root} href={`/${locale}/produkter?category=${encodeURIComponent(root)}`}>
              <CategoryIcon category={root} />
              <span>{rootLabel(root, locale)}</span>
              <small>{rootCounts.get(root) || 0} {en ? 'items' : 'objekt'}</small>
            </Link>
          ))}
        </section>
      ) : null}
    </div>
  );
}
