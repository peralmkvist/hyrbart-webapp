export type ProductBadge = 'popular' | 'very-popular';

export type RentalPrice = {
  days: 1 | 3 | 7;
  price: number;
};

export type Product = {
  slug: string;
  brand: string;
  name: string;
  type: string;
  price: string;
  category: string;
  accent: string;
  image?: string;
  badge?: ProductBadge;
  rentalPrices?: RentalPrice[];
  rating?: number;
  reviewCount?: number;
};

export const products: Product[] = [
  {
    slug: 'karcher-se-3-compact',
    brand: 'Kärcher',
    name: 'SE 3 Compact',
    type: 'Textiltvätt',
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
  },
  {
    slug: 'bosch-gcm-8-sjl',
    brand: 'Bosch',
    name: 'GCM 8 SJL',
    type: 'Kap-/gersåg',
    price: 'fr. 250 kr/dygn',
    category: 'Sågning',
    accent: '#0b7c8c',
    rating: 4.8,
    reviewCount: 17,
  },
  {
    slug: 'thule-motion-xt',
    brand: 'Thule',
    name: 'Motion XT',
    type: 'Takbox',
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
    price: 'fr. 200 kr/dygn',
    category: 'Rengöring',
    accent: '#0c6b56',
    rating: 4.8,
    reviewCount: 9,
  },
];
