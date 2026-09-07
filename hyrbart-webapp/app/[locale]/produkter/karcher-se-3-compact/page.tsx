import Link from 'next/link';
import ProductVisual from '@/components/ProductVisual';
import { ProductBadgeLabel, RentalPriceGrid } from '@/components/ProductPricing';
import { products } from '@/lib/products';
import { BackIcon, BookIcon, CheckIcon, InfoIcon, ListIcon } from '@/components/Icons';

export default async function ProductPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const en = locale === 'en';
  const product = products.find((item) => item.slug === 'karcher-se-3-compact');

  const included = en
    ? ['Universal nozzle', 'Upholstery nozzle', 'Shoe nozzle', 'Cleaning detergent – 1 dose included']
    : ['Universalmunstycke', 'Möbelmunstycke', 'Skomunstycke', 'Rengöringsmedel – 1 dos ingår'];

  return (
    <div className="pageShell detailPage karcherDetailPage">
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
          {en ? 'Carpet & upholstery cleaner' : 'Textil- och möbeltvätt'}
        </div>

        <header className="productTitle compactProductTitle">
          <h1>KÄRCHER<br />SE 3 COMPACT</h1>
          {product?.rating != null && product?.reviewCount != null && (
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
        <ProductVisual
          large
          imageSrc={product?.image ?? '/images/products/karcher-se-3-compact.png'}
          imageAlt="Kärcher SE 3 Compact med tillbehör"
        />
        <ProductBadgeLabel badge={product?.badge} locale={locale} />
      </div>
      <section className="included">
        <h2>{en ? 'Included' : 'Det här ingår'}</h2>
        <div className="includedGrid">
          {included.map((item) => (
            <div key={item}>
              <span className="checkCircle"><CheckIcon /></span>
              <span>{item}</span>
            </div>
          ))}
        </div>
      </section>
      <details className="specDropdown productDescriptionDropdown">
        <summary>
          <InfoIcon />
          <span>{en ? 'Product description' : 'Produktbeskrivning'}</span>
          <span className="specChevron" aria-hidden="true">⌄</span>
        </summary>
        <div className="specBody productDescriptionBody">
          <p>
            {en
              ? 'Compact spray-extraction cleaner for deep cleaning carpets, upholstery and other textile surfaces.'
              : 'Kompakt textil- och möbeltvätt för djuprengöring av mattor, möbler och andra textila ytor.'}
          </p>
        </div>
      </details>
      <details className="specDropdown">
        <summary>
          <ListIcon />
          <span>{en ? 'Technical specifications' : 'Tekniska specifikationer'}</span>
          <span className="specChevron" aria-hidden="true">⌄</span>
        </summary>
        <div className="specBody">
          <div><b>{en ? 'Tank capacity' : 'Tankvolym'}</b><span>1,7 / 2,9 l</span></div>
          <div><b>{en ? 'Weight' : 'Vikt'}</b><span>4,6 kg</span></div>
        </div>
      </details>
      <div className="stackedActions">
        <Link href={`/${locale}/produkter/karcher-se-3-compact/guide#kom-igang`} className="darkAction">
          <BookIcon />
          <span>{en ? 'User guide' : 'Användarguide'}</span>
          <b>›</b>
        </Link>

        <Link href={`/${locale}/produkter/karcher-se-3-compact/guide#vanliga-fel`} className="darkAction">
          <InfoIcon />
          <span>{en ? 'Common problems' : 'Vanliga problem'}</span>
          <b>›</b>
        </Link>
        <Link href={`/${locale}/produkter/karcher-se-3-compact/guide#aterlamning`} className="darkAction">
          <CheckIcon />
          <span>{en ? 'Before returning' : 'Innan återlämning'}</span>
          <b>›</b>
        </Link>
      </div>

      <RentalPriceGrid prices={product?.rentalPrices} locale={locale} />
      <a
        className="primaryButton wide"
        href="https://www.hygglo.se"
        target="_blank"
        rel="noreferrer"
      >
        {en ? 'Book on Hygglo' : 'Boka på Hygglo'} <span>↗</span>
      </a>
    </div>
  );
}
