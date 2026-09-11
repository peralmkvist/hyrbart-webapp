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

  const keyFacts = [
    {
      key: 'type',
      Icon: CategoryIcon,
      iconProps: { category: product.category },
      eyebrow: en ? 'Type' : 'Typ',
      value: typeLabel,
    },
    highlight
      ? {
          key: 'highlight',
          Icon: CheckIcon,
          iconProps: {},
          eyebrow: en ? 'Good to know' : 'Bra att veta',
          value: highlight,
        }
      : included[0]
        ? {
            key: 'included',
            Icon: CheckIcon,
            iconProps: {},
            eyebrow: en ? 'Included' : 'Ingår',
            value: en ? included[0].en : included[0].sv,
          }
        : null,
    specs[0]
      ? {
          key: 'spec-1',
          Icon: MeasureIcon,
          iconProps: {},
          eyebrow: en ? specs[0].label.en : specs[0].label.sv,
          value: specs[0].value,
        }
      : null,
    product.guideAvailable
      ? {
          key: 'guide',
          Icon: BookIcon,
          iconProps: {},
          eyebrow: en ? 'Guide' : 'Guide',
          value: en ? 'User guide included' : 'Användarguide finns',
        }
      : specs[1]
        ? {
            key: 'spec-2',
            Icon: MeasureIcon,
            iconProps: {},
            eyebrow: en ? specs[1].label.en : specs[1].label.sv,
            value: specs[1].value,
          }
        : null,
  ].filter(Boolean) as Array<{
    key: string;
    Icon: typeof CheckIcon;
    iconProps: Record<string, string>;
    eyebrow: string;
    value: string;
  }>;

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
        <span>{typeLabel}</span>
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
          <span className="productType2">{typeLabel}</span>
          <h1>{product.brand} {product.name}</h1>
          {product.price ? <div className="productPrice2">{en ? product.price.replace('fr.', 'from') : product.price}</div> : null}
          {shortDescription ? <p>{shortDescription}</p> : null}
          {product.rating != null && product.reviewCount != null ? (
            <div className="productRating2" aria-label={`${product.rating} av 5, ${product.reviewCount} omdömen`}>
              <span aria-hidden="true">★</span>
              <strong>{product.rating.toFixed(1).replace('.', ',')}</strong>
              <span>({product.reviewCount} {en ? 'reviews' : 'omdömen'})</span>
            </div>
          ) : null}
        </div>
      </section>

      {keyFacts.length ? (
        <section className="productFacts2" aria-label={en ? 'Key product facts' : 'Viktiga produktfakta'}>
          {keyFacts.slice(0, 4).map(({ key, Icon, iconProps, eyebrow, value }) => (
            <div className="productFact2" key={key}>
              <span className="productFactIcon2"><Icon {...iconProps} /></span>
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
              <span className="productSectionIcon2"><InfoIcon /></span>
              <span>{en ? 'Product description' : 'Produktbeskrivning'}</span>
              <ForwardIcon className="productChevron2" />
            </summary>
            <div className="productAccordionBody2"><p>{description}</p></div>
          </details>
        ) : null}

        {included.length ? (
          <details className="productAccordion2">
            <summary>
              <span className="productSectionIcon2"><CheckIcon /></span>
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
              <span className="productSectionIcon2"><ListIcon /></span>
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
            <span className="productSectionIcon2"><BookIcon /></span>
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
        <span>{en ? 'Book on Hygglo' : 'Boka på Hygglo'}</span>
        <span aria-hidden="true">↗</span>
      </a>
    </div>
  );
}
