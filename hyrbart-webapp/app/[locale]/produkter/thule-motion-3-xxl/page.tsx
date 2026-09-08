import Link from 'next/link';
import ProductGallery from '@/components/ProductGallery';
import { RentalPriceGrid } from '@/components/ProductPricing';
import { BackIcon, InfoIcon, ListIcon } from '@/components/Icons';

export default async function ThuleMotion3XxlPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const en = locale === 'en';

  const rentalPrices = [
    { days: 1 as const, price: 130 },
    { days: 3 as const, price: 395 },
    { days: 7 as const, price: 586 },
  ];

  const specifications = [
    {
      sv: 'Volym',
      en: 'Volume',
      value: '600 liter',
    },
    {
      sv: 'Längd',
      en: 'Length',
      value: '232 cm',
    },
    {
      sv: 'Bredd',
      en: 'Width',
      value: '92 cm',
    },
    {
      sv: 'Höjd',
      en: 'Height',
      value: '46 cm',
    },
    {
      sv: 'Höjd över lasthållarrör',
      en: 'Height above load bars',
      value: '41 mm',
    },
    {
      sv: 'Innermått',
      en: 'Internal dimensions',
      value: '220 × 77 × 40 cm',
    },
    {
      sv: 'Vikt',
      en: 'Weight',
      value: '25 kg',
    },
    {
      sv: 'Maxlast',
      en: 'Maximum load',
      value: '75 kg',
    },
    {
      sv: 'Maxbredd lasthållarrör',
      en: 'Maximum load-bar width',
      value: '90 mm',
    },
    {
      sv: 'Maxlängd skidor',
      en: 'Maximum ski length',
      value: '215 cm',
    },
  ];

  const description = en
    ? 'A spacious 600-litre roof box for ski trips, family holidays and longer journeys. It has room for skis up to 215 cm, opens from both sides and mounts quickly without tools. I am happy to help with installation when you collect it. After normal use, you do not need to wash or clean the box before returning it.'
    : 'Rymlig takbox med 600 liters packvolym för skidresor, familjesemester och längre bilresor. Den har plats för skidor upp till 215 cm, kan öppnas från båda sidor och monteras snabbt utan verktyg. Jag hjälper gärna till med monteringen vid hämtning. Efter normal användning behöver du inte tvätta eller städa boxen före återlämning.';

  const highlights = en
    ? [
        'Holds 5–7 pairs of skis / 3–5 snowboards',
        'Opens from both sides',
        'Quick tool-free installation',
        'Automatic locking with confirmation when correctly closed',
        'Stable and quiet at motorway speeds',
        'Stored in a garage and kept in excellent condition',
      ]
    : [
        'Rymmer 5–7 skidpar / 3–5 snowboards',
        'Öppningsbar från båda sidor',
        'Snabb montering utan verktyg',
        'Låser automatiskt och visar när boxen är korrekt stängd',
        'Mycket stabil och tyst i motorvägsfart',
        'Förvaras i garage och är i toppskick',
      ];

  return (
    <div className="pageShell detailPage karcherDetailPage thuleDetailPage">
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
          {en ? 'Roof box' : 'Takbox'}
        </div>

        <header className="productTitle compactProductTitle">
          <h1>THULE<br />MOTION 3 XXL</h1>
        </header>
      </div>

      <div className="detailProductVisual productDetailPhotoWrap">
        <ProductGallery
          images={['/images/products/thule-motion-3-xxl.png']}
          alt="Thule Motion 3 XXL takbox"
          locale={locale}
        />
      </div>

      <details className="specDropdown productDescriptionDropdown">
        <summary>
          <InfoIcon />
          <span>{en ? 'Product description' : 'Produktbeskrivning'}</span>
          <span className="specChevron" aria-hidden="true">⌄</span>
        </summary>

        <div className="specBody productDescriptionBody">
          <p>{description}</p>

          <div className="thuleHighlights">
            {highlights.map((item) => (
              <div key={item}>✓ {item}</div>
            ))}
          </div>
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
            <div key={spec.sv}>
              <b>{en ? spec.en : spec.sv}</b>
              <span>{spec.value}</span>
            </div>
          ))}
        </div>
      </details>

      <RentalPriceGrid prices={rentalPrices} locale={locale} />

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
