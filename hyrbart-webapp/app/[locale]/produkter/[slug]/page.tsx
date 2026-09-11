import type { ReactNode } from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import ProductGallery from '@/components/ProductGallery';
import ProductVisual from '@/components/ProductVisual';
import { getProduct } from '@/lib/sanity-products';
import {
  BackIcon,
  BookIcon,
  CategoryIcon,
  CheckIcon,
  ForwardIcon,
  InfoIcon,
  ListIcon,
  MeasureIcon,
} from '@/components/Icons';

function firstSentence(text?: string) {
  if (!text) return '';
  const normalized = text.replace(/\s+/g, ' ').trim();
  const match = normalized.match(/^(.+?[.!?])(?:\s|$)/);
  return (match?.[1] ?? normalized).slice(0, 190);
}

function formatPrice(price: string, en: boolean) {
  if (!en) return price;
  return price.replace(/^fr\.\s*/i, 'from ').replace(/\s*kr\/dygn$/i, ' SEK/day');
}

type ProductFact = {
  key: string;
  icon: ReactNode;
  eyebrow: string;
  value: string;
};

export default async function GenericProductPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  const en = locale === 'en';
  const product = await getProduct(slug);
  if (!product) notFound();

  const typeLabel = en ? product.typeEn ?? product.type : product.type;
  const description = product.description ? (en ? product.description.en : product.description.sv) : '';
  const shortDescription = firstSentence(description);
  const included = product.included ?? [];
  const specs = product.specifications ?? [];
  const highlight = product.cardHighlight ? (en ? product.cardHighlight.en : product.cardHighlight.sv) : '';

  const keyFacts: ProductFact[] = [
    {
      key: 'type',
      icon: <CategoryIcon category={product.category} />,
      eyebrow: en ? 'Type' : 'Typ',
      value: typeLabel,
    },
  ];

  if (highlight) {
    keyFacts.push({
      key: 'highlight',
      icon: <CheckIcon />,
      eyebrow: en ? 'Good to know' : 'Bra att veta',
      value: highlight,
    });
  } else if (included[0]) {
    keyFacts.push({
      key: 'included',
      icon: <CheckIcon />,
      eyebrow: en ? 'Included' : 'Ingår',
      value: en ? included[0].en : included[0].sv,
    });
  }

  if (specs[0]) {
    keyFacts.push({
      key: 'spec-1',
      icon: <MeasureIcon />,
      eyebrow: en ? specs[0].label.en : specs[0].label.sv,
      value: specs[0].value,
    });
  }

  if (product.guideAvailable) {
    keyFacts.push({
      key: 'guide',
      icon: <BookIcon />,
      eyebrow: en ? 'Guide' : 'Guide',
      value: en ? 'User guide included' : 'Användarguide finns',
    });
  } else if (specs[1]) {
    keyFacts.push({
      key: 'spec-2',
      icon: <MeasureIcon />,
      eyebrow: en ? specs[1].label.en : specs[1].label.sv,
      value: specs[1].value,
    });
  }

  return (
    <div className="productPage2">
      <header className="productTopbar2">
        <Link
          href={`/${locale}/produkter`}
          className="productBack2"
          aria-label={en ? 'Back to products' : 'Tillbaka till produkter'}
        >
          <BackIcon />
        </Link>
      </header>

      <section className="productHero2">
        <div className="productGallery2">
          {product.images?.length || product.image ? (
            <ProductGallery
              images={product.images?.length ? product.images : [product.image!]}
              alt={`${product.brand} ${product.name}`}
              badge={product.badge}
              locale={locale}
            />
          ) : (
            <ProductVisual kind="cleaner" accent={product.accent} />
          )}
        </div>

        <div className="productIdentity2">
          <h1>
            <span className="productBrand2">{product.brand}</span>
            <span className="productName2">{product.name}</span>
          </h1>
          {product.price ? <div className="productPrice2">{formatPrice(product.price, en)}</div> : null}
          {shortDescription ? <p>{shortDescription}</p> : null}
          {product.rating != null && product.reviewCount != null ? (
            <div className="productRating2" aria-label={`${product.rating} ${en ? 'out of 5' : 'av 5'}, ${product.reviewCount} ${en ? 'reviews' : 'omdömen'}`}>
              <span aria-hidden="true">★</span>
              <strong>{product.rating.toFixed(1).replace('.', ',')}</strong>
              <span>({product.reviewCount} {en ? 'reviews' : 'omdömen'})</span>
            </div>
          ) : null}
        </div>
      </section>

      {keyFacts.length ? (
        <section className="productFacts2" aria-label={en ? 'Key product facts' : 'Viktiga produktfakta'}>
          {keyFacts.slice(0, 4).map(({ key, icon, eyebrow, value }) => (
            <div className="productFact2" key={key}>
              <span className="productFactIcon2">{icon}</span>
              <div>
                <span>{eyebrow}</span>
                <strong>{value}</strong>
              </div>
            </div>
          ))}
        </section>
      ) : null}

      <section className="productSections2">
        {description ? (
          <details className="productAccordion2">
            <summary>
              <span>{en ? 'Product description' : 'Produktbeskrivning'}</span>
              <ForwardIcon className="productChevron2" />
            </summary>
            <div className="productAccordionBody2"><p>{description}</p></div>
          </details>
        ) : null}

        {included.length ? (
          <details className="productAccordion2">
            <summary>
              <span>{en ? 'Included' : 'Detta ingår'}</span>
              <ForwardIcon className="productChevron2" />
            </summary>
            <div className="productAccordionBody2">
              <ul className="includedList2">
                {included.map((item) => {
                  const text = en ? item.en : item.sv;
                  return <li key={text}><CheckIcon /><span>{text}</span></li>;
                })}
              </ul>
            </div>
          </details>
        ) : null}

        {specs.length ? (
          <details className="productAccordion2">
            <summary>
              <span>{en ? 'Specifications' : 'Specifikationer'}</span>
              <ForwardIcon className="productChevron2" />
            </summary>
            <div className="productAccordionBody2 productSpecs2">
              {specs.map((spec) => (
                <div key={spec.label.sv}>
                  <span>{en ? spec.label.en : spec.label.sv}</span>
                  <strong>{spec.value}</strong>
                </div>
              ))}
            </div>
          </details>
        ) : null}

        {product.guideAvailable ? (
          <Link className="productGuideRow2" href={`/${locale}/produkter/${product.slug}/guide`}>
            <span>{en ? 'User guide' : 'Användarguide'}</span>
            <ForwardIcon />
          </Link>
        ) : null}
      </section>

      <a
        className="hyggloButton2"
        href={product.hyggloUrl ?? 'https://www.hygglo.se'}
        target="_blank"
        rel="noreferrer"
      >
        {en ? 'Book on Hygglo' : 'Boka på Hygglo'}
      </a>
    </div>
  );
}
