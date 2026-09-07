export type ProductBadge = 'popular' | 'very-popular';

export type RentalPrice = {
  days: 1 | 3 | 7;
  price: number;
};

export type LocalizedText = {
  sv: string;
  en: string;
};

export type ProductSpecification = {
  label: LocalizedText;
  value: string;
};

export type Product = {
  slug: string;
  brand: string;
  name: string;
  type: string;
  typeEn?: string;
  price: string;
  category: string;
  accent: string;
  image?: string;
  badge?: ProductBadge;
  rentalPrices?: RentalPrice[];
  rating?: number;
  reviewCount?: number;

  // Used by the full product-detail template.
  detailCategory?: LocalizedText;
  included?: LocalizedText[];
  description?: LocalizedText;
  specifications?: ProductSpecification[];
  guideAvailable?: boolean;
  hyggloUrl?: string;
};

export const products: Product[] = [
  {
    slug: 'karcher-se-3-compact',
    brand: 'Kärcher',
    name: 'SE 3 Compact',
    type: 'Textiltvätt',
    typeEn: 'Textile cleaner',
    price: 'fr. 83 kr/dygn',
    category: 'Rengöring',
    accent: '#f4c300',
    image: '/images/products/karcher-se-3-compact.png',
    badge: 'very-popular',
    rating: 4.9,
    reviewCount: 28,
    rentalPrices: [
      { days: 1, price: 145 },
      { days: 3, price: 290 },
      { days: 7, price: 580 },
    ],
    guideAvailable: true,
  },
  {
    slug: 'bosch-gbh-18v-22',
    brand: 'Bosch',
    name: 'GBH 18V-22',
    type: 'Borrhammare',
    typeEn: 'Rotary hammer',
    price: 'fr. 120 kr/dygn',
    category: 'Bygg',
    accent: '#0b7c8c',
    rentalPrices: [
      { days: 1, price: 120 },
      { days: 3, price: 240 },
      { days: 7, price: 400 },
    ],
    detailCategory: {
      sv: 'Borrhammare',
      en: 'Rotary hammer',
    },
    included: [
      { sv: '2 batterier & laddare', en: '2 batteries & charger' },
      { sv: 'Djupanslag', en: 'Depth stop' },
      { sv: 'Dammutsug', en: 'Dust extraction attachment' },
      { sv: 'Betongborrar', en: 'Concrete drill bits' },
      { sv: 'Bilningsmejslar', en: 'Chisels' },
      { sv: 'Förvaringsväska', en: 'Storage case' },
    ],
    description: {
      sv: 'En kompakt, batteridriven borrhammare för borrning i betong, tegel och murverk samt lättare bilningsarbeten. SDS plus-fästet gör det enkelt att byta mellan borr och mejslar. Maskinen har 1,9 J slagenergi och är utrustad med bland annat KickBack Control och Vibration Control.',
      en: 'A compact cordless rotary hammer for drilling in concrete, brick and masonry, as well as lighter chiselling work. The SDS plus holder makes it easy to switch between drill bits and chisels. The machine has 1.9 J of impact energy and features KickBack Control and Vibration Control.',
    },
    specifications: [
      { label: { sv: 'Batterispänning', en: 'Battery voltage' }, value: '18 V' },
      { label: { sv: 'Verktygsfäste', en: 'Tool holder' }, value: 'SDS plus' },
      { label: { sv: 'Slagenergi', en: 'Impact energy' }, value: '1,9 J' },
      { label: { sv: 'Slagfrekvens', en: 'Impact rate' }, value: '0–4 675 slag/min' },
      { label: { sv: 'Varvtal', en: 'Rated speed' }, value: '0–1 050 varv/min' },
      { label: { sv: 'Borrdiameter betong', en: 'Drilling diameter in concrete' }, value: '4–22 mm' },
      { label: { sv: 'Optimalt område i betong', en: 'Optimum range in concrete' }, value: '4–12 mm' },
      { label: { sv: 'Vikt utan batteri', en: 'Weight without battery' }, value: '2,3 kg' },
    ],
    guideAvailable: true,
    hyggloUrl: 'https://www.hygglo.se',
  },
  {
    slug: 'thule-motion-xt',
    brand: 'Thule',
    name: 'Motion XT',
    type: 'Takbox',
    typeEn: 'Roof box',
    price: 'fr. 150 kr/dygn',
    category: 'Bil & transport',
    accent: '#222',
    rating: 4.9,
    reviewCount: 12,
  },
  {
    slug: 'metabo-asa-30-l-pc',
    brand: 'Metabo',
    name: 'ASA 30 L PC',
    type: 'Grovdamm­sugare',
    typeEn: 'Wet/dry vacuum',
    price: 'fr. 200 kr/dygn',
    category: 'Rengöring',
    accent: '#0c6b56',
    rating: 4.8,
    reviewCount: 9,
  },
];
