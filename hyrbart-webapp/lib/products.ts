export type ProductBadge = 'popular' | 'very-popular';

export type RentalPrice = {
  days: number;
  price: number;
};

export type RentalDiscounts = {
  multiDayPercent?: number;
  weeklyPercent?: number;
  repeatCustomerPercent?: number;
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
  dailyPrice?: number;
  discounts?: RentalDiscounts;
  category: string;
  accent: string;
  image?: string;
  images?: string[];
  badge?: ProductBadge;
  rentalPrices?: RentalPrice[];
  rating?: number;
  reviewCount?: number;
  cardHighlight?: LocalizedText;
  owner?: { id?: string; name?: string; city?: string; profileImage?: string; responseTimeMinutes?: number };
  pickupLocation?: { id?: string; name?: string; city?: string; area?: string; lat: number; lng: number };

  detailCategory?: LocalizedText;
  included?: LocalizedText[];
  description?: LocalizedText;
  specifications?: ProductSpecification[];
  guideAvailable?: boolean;
  hyggloUrl?: string;
  supplierUrl?: string;
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
    rating: 5.0,
    reviewCount: 19,
    cardHighlight: { sv: 'Munstycken ingår', en: 'Nozzles included' },
    rentalPrices: [
      { days: 1, price: 145 },
      { days: 3, price: 290 },
      { days: 7, price: 580 },
    ],
    detailCategory: { sv: 'Textil- och möbeltvätt', en: 'Carpet & upholstery cleaner' },
    included: [
      { sv: 'Universalmunstycke', en: 'Universal nozzle' },
      { sv: 'Möbelmunstycke', en: 'Upholstery nozzle' },
      { sv: 'Skomunstycke', en: 'Shoe nozzle' },
      { sv: 'Rengöringsmedel – 1 dos ingår', en: 'Cleaning detergent – 1 dose included' },
    ],
    description: {
      sv: 'Kompakt textil- och möbeltvätt för djuprengöring av mattor, möbler och andra textila ytor.',
      en: 'Compact spray-extraction cleaner for deep cleaning carpets, upholstery and other textile surfaces.',
    },
    specifications: [
      { label: { sv: 'Tankvolym', en: 'Tank capacity' }, value: '1,7 / 2,9 l' },
      { label: { sv: 'Vikt', en: 'Weight' }, value: '4,6 kg' },
    ],
    guideAvailable: true,
    hyggloUrl: 'https://www.hygglo.se/i/0b7-textiltvatt-karcher-se-3-compact',
  },
  {
    slug: 'bosch-gbh-18v-22', brand: 'Bosch', name: 'GBH 18V-22', type: 'Borrhammare', typeEn: 'Rotary hammer',
    price: 'fr. 120 kr/dygn', category: 'Bygg', accent: '#0b7c8c', image: '/images/products/bosch-gbh-18v-22.png',
    rentalPrices: [{days:1,price:120},{days:3,price:240},{days:7,price:400}],
    detailCategory: {sv:'Borrhammare',en:'Rotary hammer'},
    included: [
      {sv:'2 batterier & laddare',en:'2 batteries & charger'}, {sv:'Djupanslag',en:'Depth stop'},
      {sv:'Dammutsug',en:'Dust extraction attachment'}, {sv:'Betongborrar',en:'Concrete drill bits'},
      {sv:'Bilningsmejslar',en:'Chisels'}, {sv:'Förvaringsväska',en:'Storage case'},
    ],
    description: {sv:'En kompakt, batteridriven borrhammare för borrning i betong, tegel och murverk samt lättare bilningsarbeten. SDS plus-fästet gör det enkelt att byta mellan borr och mejslar. Maskinen har 1,9 J slagenergi och är utrustad med bland annat KickBack Control och Vibration Control.',en:'A compact cordless rotary hammer for drilling in concrete, brick and masonry, as well as lighter chiselling work. The SDS plus holder makes it easy to switch between drill bits and chisels. The machine has 1.9 J of impact energy and features KickBack Control and Vibration Control.'},
    specifications: [
      {label:{sv:'Batterispänning',en:'Battery voltage'},value:'18 V'}, {label:{sv:'Verktygsfäste',en:'Tool holder'},value:'SDS plus'},
      {label:{sv:'Slagenergi',en:'Impact energy'},value:'1,9 J'}, {label:{sv:'Slagfrekvens',en:'Impact rate'},value:'0–4 675 slag/min'},
      {label:{sv:'Varvtal',en:'Rated speed'},value:'0–1 050 varv/min'}, {label:{sv:'Borrdiameter betong',en:'Drilling diameter in concrete'},value:'4–22 mm'},
      {label:{sv:'Optimalt område i betong',en:'Optimum range in concrete'},value:'4–12 mm'}, {label:{sv:'Vikt utan batteri',en:'Weight without battery'},value:'2,3 kg'},
    ],
    guideAvailable: true,
    hyggloUrl:'https://www.hygglo.se/i/bfa-borrhammare-bosch-18v-inkl-utsug-borrar-mejslar',
  },
  {
    slug:'thule-motion-3-xxl',brand:'Thule',name:'Motion 3 XXL',type:'Takbox',typeEn:'Roof box',price:'fr. 130 kr/dygn',category:'Bil & transport',accent:'#222',image:'/images/products/thule-motion-3-xxl.png',badge:'very-popular',rating:5.0,reviewCount:10,
    rentalPrices:[{days:1,price:130},{days:3,price:395},{days:7,price:586}],detailCategory:{sv:'Takbox',en:'Roof box'},
    description:{sv:'Rymlig takbox med 600 liters packvolym för skidresor, familjesemester och längre bilresor. Den har plats för skidor upp till 215 cm, kan öppnas från båda sidor och monteras snabbt utan verktyg. Jag hjälper gärna till med monteringen vid hämtning. Efter normal användning behöver du inte tvätta eller städa boxen före återlämning.',en:'A spacious 600-litre roof box for ski trips, family holidays and longer journeys. It has room for skis up to 215 cm, opens from both sides and mounts quickly without tools. I am happy to help with installation when you collect it. After normal use, you do not need to wash or clean the box before returning it.'},
    specifications:[{label:{sv:'Volym',en:'Volume'},value:'600 liter'},{label:{sv:'Längd',en:'Length'},value:'232 cm'},{label:{sv:'Bredd',en:'Width'},value:'92 cm'},{label:{sv:'Höjd',en:'Height'},value:'46 cm'},{label:{sv:'Höjd över lasthållarrör',en:'Height above load bars'},value:'41 mm'},{label:{sv:'Innermått',en:'Internal dimensions'},value:'220 × 77 × 40 cm'},{label:{sv:'Vikt',en:'Weight'},value:'25 kg'},{label:{sv:'Maxlast',en:'Maximum load'},value:'75 kg'},{label:{sv:'Maxbredd lasthållarrör',en:'Maximum load-bar width'},value:'90 mm'},{label:{sv:'Maxlängd skidor',en:'Maximum ski length'},value:'215 cm'}],
    hyggloUrl:'https://www.hygglo.se/i/132-takbox-thule-motion-3-xxl',
  },
  {slug:'metabo-asa-30-l-pc',brand:'Metabo',name:'ASA 30 L PC',type:'Grovdamm­sugare',typeEn:'Wet/dry vacuum',price:'fr. 200 kr/dygn',category:'Rengöring',accent:'#0c6b56'},
];
