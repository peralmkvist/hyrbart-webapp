export type Product = {
  slug: string;
  brand: string;
  name: string;
  type: string;
  price: string;
  category: string;
  accent: string;
};

export const products: Product[] = [
  { slug: 'karcher-se-3-compact', brand: 'Kärcher', name: 'SE 3 Compact', type: 'Textiltvätt', price: 'fr. 200 kr/dygn', category: 'Rengöring', accent: '#f4c300' },
  { slug: 'bosch-gcm-8-sjl', brand: 'Bosch', name: 'GCM 8 SJL', type: 'Kap-/gersåg', price: 'fr. 250 kr/dygn', category: 'Sågning', accent: '#0b7c8c' },
  { slug: 'thule-motion-xt', brand: 'Thule', name: 'Motion XT', type: 'Takbox', price: 'fr. 150 kr/dygn', category: 'Bil & transport', accent: '#222' },
  { slug: 'metabo-asa-30-l-pc', brand: 'Metabo', name: 'ASA 30 L PC', type: 'Grovdamm­sugare', price: 'fr. 200 kr/dygn', category: 'Rengöring', accent: '#0c6b56' }
];
