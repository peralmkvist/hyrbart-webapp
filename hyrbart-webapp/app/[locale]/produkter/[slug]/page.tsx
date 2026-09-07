import Link from 'next/link';
import { notFound } from 'next/navigation';
import ProductGallery from '@/components/ProductGallery';
import ProductVisual from '@/components/ProductVisual';
import { RentalPriceGrid } from '@/components/ProductPricing';
import { products } from '@/lib/products';
import { BackIcon, BookIcon, CheckIcon, InfoIcon, ListIcon } from '@/components/Icons';

export default async function GenericProductPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  const en = locale === 'en';
  const product = products.find((item) => item.slug === slug);

  if (!product) notFound();

  const hasFullDetails =
    product.included?.length &&
    product.description &&
    product.specifications?.length;

  if (!hasFullDetails) {
    const index = products.findIndex((item) => item.slug === slug);

    return (
      <div className="pageShell genericProductPage">
        <Link href={`/${locale}/produkter`} className="backLink">
          ← {en ? 'Products' : 'Produkter'}
        </Link>

        <div className="genericProductHero">
          <ProductVisual
            kind={index === 1 ? 'saw' : 'cleaner'}
            accent={product.accent}
          />
          <div className="productTitle">
            <p>{en ? product.typeEn ?? product.type : product.type}</p>
            <h1>{product.brand}<br />{product.name}</h1>
            <p>{product.price}</p>
          </div>
        </div>

        <div className="genericProductNotice">
          <strong>
            {en
              ? 'More product information is coming.'
              : 'Mer produktinformation kommer här.'}
          </strong>
          <p>
            {en
              ? 'We are building the product detail page and user guide.'
              : 'Vi bygger nu upp detaljsidan och användarguiden för den här produkten.'}
          </p>
        </div>
      </div>
    );
  }

  const included = product.included!;
  const description = product.description!;
  const specifications = product.specifications!;

  return (
    <div className={`pageShell detailPage ${product.slug === 'bosch-gbh-18v-22' ? 'boschDetailPage' : 'karcherDetailPage'}`}>
      <div className="productHeaderSticky">
        <Link
          href={`/${locale}/produkter`}
          className="productBackRow"
          aria-label={en ? 'Back to product list' : 'Tillbaka till produktlistan'}
        >
          <BackIcon />
          <span>{en ? 'Back to product list' : 'Tillbaka till produktlistan'}</span>
        </Link>

        <div className="productCategoryRow">
          {product.detailCategory
            ? (en ? product.detailCategory.en : product.detailCategory.sv)
            : (en ? product.typeEn ?? product.type : product.type)}
        </div>

        <header className="productTitle compactProductTitle">
          <h1>{product.brand.toUpperCase()}<br />{product.name.toUpperCase()}</h1>

          {product.rating != null && product.reviewCount != null && (
            <div
              className="productDetailRating"
              aria-label={`${product.rating} av 5, ${product.reviewCount} omdömen`}
            >
              <span className="ratingStars" aria-hidden="true">★★★★★</span>
              <strong>{product.rating.toFixed(1).replace('.', ',')}</strong>
              <span>
                ({product.reviewCount} {en ? 'reviews' : 'omdömen'})
              </span>
            </div>
          )}
        </header>
      </div>

      <div className="detailProductVisual productDetailPhotoWrap">
        {product.image ? (
          <ProductGallery
            images={[product.image]}
            alt={`${product.brand} ${product.name}`}
            badge={product.badge}
            locale={locale}
          />
        ) : (
          <ProductVisual kind="cleaner" accent={product.accent} />
        )}
      </div>

      <section className="included">
        <h2>{en ? 'Included' : 'Det här ingår'}</h2>
        <div className="includedGrid">
          {included.map((item) => {
            const text = en ? item.en : item.sv;
            return (
              <div key={text}>
                <span className="checkCircle"><CheckIcon /></span>
                <span>{text}</span>
              </div>
            );
          })}
        </div>
      </section>

      <details className="specDropdown productDescriptionDropdown">
        <summary>
          <InfoIcon />
          <span>{en ? 'Product description' : 'Produktbeskrivning'}</span>
          <span className="specChevron" aria-hidden="true">⌄</span>
        </summary>
        <div className="specBody productDescriptionBody">
          <p>{en ? description.en : description.sv}</p>
        </div>
      </details>

      <details className="specDropdown">
        <summary>
          <ListIcon />
          <span>{en ? 'Technical specifications' : 'Tekniska specifikationer'}</span>
          <span className="specChevron" aria-hidden="true">⌄</span>
        </summary>
        <div className="specBody">
          {specifications.map((spec) => (
            <div key={spec.label.sv}>
              <b>{en ? spec.label.en : spec.label.sv}</b>
              <span>{spec.value}</span>
            </div>
          ))}
        </div>
      </details>

      {product.guideAvailable && (
        <div className="stackedActions">
          <Link href={`/${locale}/produkter/${product.slug}/guide#kom-igang`} className="darkAction">
            <BookIcon />
            <span>{en ? 'User guide' : 'Användarguide'}</span>
            <b>›</b>
          </Link>

          <Link href={`/${locale}/produkter/${product.slug}/guide#vanliga-fel`} className="darkAction">
            <InfoIcon />
            <span>{en ? 'Common problems' : 'Vanliga problem'}</span>
            <b>›</b>
          </Link>

          <Link href={`/${locale}/produkter/${product.slug}/guide#aterlamning`} className="darkAction">
            <CheckIcon />
            <span>{en ? 'Before returning' : 'Innan återlämning'}</span>
            <b>›</b>
          </Link>
        </div>
      )}

      <RentalPriceGrid prices={product.rentalPrices} locale={locale} />

      <a
        className="primaryButton wide"
        href={product.hyggloUrl ?? 'https://www.hygglo.se'}
        target="_blank"
        rel="noreferrer"
      >
        {en ? 'Book on Hygglo' : 'Boka på Hygglo'} <span>↗</span>
      </a>
    </div>
  );
}
