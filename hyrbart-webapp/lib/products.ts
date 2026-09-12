export type ProductBadge = 'popular' | 'very-popular';
export type CancellationPolicy = 'flexible'|'moderate'|'restrained'|'limited'|'strict';

export type RentalPrice = { days: number; price: number; };
export type RentalDiscounts = { multiDayPercent?: number; weeklyPercent?: number; repeatCustomerPercent?: number; };
export type LocalizedText = { sv: string; en: string; };
export type ProductSpecification = { label: LocalizedText; value: string; };

export type Product = {
  id?: string; slug: string; brand: string; name: string; type: string; typeEn?: string; price: string; dailyPrice?: number; discounts?: RentalDiscounts;
  cancellationPolicy?: CancellationPolicy;
  category: string; accent: string; image?: string; images?: string[]; badge?: ProductBadge; rentalPrices?: RentalPrice[]; rating?: number; reviewCount?: number; cardHighlight?: LocalizedText;
  owner?: { id?: string; name?: string; city?: string; profileImage?: string; responseTimeMinutes?: number };
  pickupLocation?: { id?: string; name?: string; city?: string; area?: string; lat: number; lng: number };
  detailCategory?: LocalizedText; included?: LocalizedText[]; description?: LocalizedText; specifications?: ProductSpecification[]; guideAvailable?: boolean; hyggloUrl?: string; supplierUrl?: string;
};

export const products: Product[] = [
  {slug:'karcher-se-3-compact',brand:'Kärcher',name:'SE 3 Compact',type:'Textiltvätt',typeEn:'Textile cleaner',price:'fr. 83 kr/dygn',category:'Rengöring',accent:'#f4c300',image:'/images/products/karcher-se-3-compact.png',cancellationPolicy:'moderate'},
  {slug:'bosch-gbh-18v-22',brand:'Bosch',name:'GBH 18V-22',type:'Borrhammare',typeEn:'Rotary hammer',price:'fr. 100 kr/dygn',category:'Borra & Skruva',accent:'#f4c300',image:'/images/products/bosch-gbh-18v-22.png',cancellationPolicy:'moderate'},
  {slug:'thule-motion-3-xxl',brand:'Thule',name:'Motion 3 XXL',type:'Takbox',typeEn:'Roof box',price:'fr. 250 kr/dygn',category:'Biltillbehör',accent:'#f4c300',image:'/images/products/thule-motion-3-xxl.png',cancellationPolicy:'strict'}
];
