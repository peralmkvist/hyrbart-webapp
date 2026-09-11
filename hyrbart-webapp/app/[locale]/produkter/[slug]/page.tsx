import Link from 'next/link';
import { notFound } from 'next/navigation';
import ProductGallery from '@/components/ProductGallery';
import ProductVisual from '@/components/ProductVisual';
import { getProduct, getProducts } from '@/lib/sanity-products';
import { calculateRentalPricing } from '@/lib/rental-pricing';
import { BackIcon, CheckIcon, ForwardIcon } from '@/components/Icons';
import styles from './owner-card.module.css';

function firstSentence(text?:string){if(!text)return'';const normalized=text.replace(/\s+/g,' ').trim(),match=normalized.match(/^(.+?[.!?])(?:\s|$)/);return(match?.[1]??normalized).slice(0,190)}
function formatPrice(price:string,en:boolean){if(!en)return price;return price.replace(/^fr\.\s*/i,'from ').replace(/\s*kr\/dygn$/i,' SEK/day')}
function formatRentalDate(value:string,en:boolean){return new Intl.DateTimeFormat(en?'en-GB':'sv-SE',{day:'numeric',month:'short'}).format(new Date(`${value}T12:00:00`)).replace('.','.')}
function formatResponseTime(minutes:number,en:boolean){
 if(minutes<=5)return en?'Replies in a few minutes':'Svarar inom några minuter';
 if(minutes<=15)return en?'Usually replies within 15 minutes':'Svarar oftast inom 15 minuter';
 if(minutes<=30)return en?'Usually replies within 30 minutes':'Svarar oftast inom 30 minuter';
 if(minutes<=60)return en?'Usually replies within 1 hour':'Svarar oftast inom 1 timme';
 const hours=Math.ceil(minutes/60);
 if(hours<=24)return en?`Usually replies within ${hours} hours`:`Svarar oftast inom ${hours} timmar`;
 const days=Math.ceil(hours/24);
 return en?`Usually replies within ${days} ${days===1?'day':'days'}`:`Svarar oftast inom ${days} ${days===1?'dag':'dagar'}`;
}
type SearchContext={q?:string;category?:string;from?:string;to?:string;place?:string;radius?:string};

export default async function GenericProductPage({params,searchParams}:{params:Promise<{locale:string;slug:string}>;searchParams:Promise<SearchContext>}){
 const {locale,slug}=await params,sp=await searchParams,en=locale==='en';
 const [product,allProducts]=await Promise.all([getProduct(slug),getProducts()]);if(!product)notFound();
 const typeLabel=en?product.typeEn??product.type:product.type,description=product.description?(en?product.description.en:product.description.sv):'',shortDescription=firstSentence(description),included=product.included??[],specs=product.specifications??[];
 const pricing=sp.from?calculateRentalPricing(product.price,sp.from,sp.to||sp.from,product.rentalPrices):null,hasRentalContext=Boolean(sp.from),resultsParams=new URLSearchParams();
 if(sp.q)resultsParams.set('q',sp.q);if(sp.category)resultsParams.set('category',sp.category);if(sp.from)resultsParams.set('from',sp.from);if(sp.to)resultsParams.set('to',sp.to);if(sp.place)resultsParams.set('place',sp.place);if(sp.radius)resultsParams.set('radius',sp.radius);
 const resultsHref=`/${locale}/produkter${resultsParams.size?`?${resultsParams.toString()}`:''}`,editParams=new URLSearchParams(resultsParams);editParams.set('edit','1');const editSearchHref=`/${locale}/produkter?${editParams.toString()}`;
 const ownerProducts=product.owner?.id?allProducts.filter(p=>p.owner?.id===product.owner?.id):[];
 const ownerReviewCount=ownerProducts.reduce((sum,p)=>sum+(p.reviewCount??0),0);
 const ownerRatingSum=ownerProducts.reduce((sum,p)=>sum+((p.rating??0)*(p.reviewCount??0)),0);
 const ownerRating=ownerReviewCount>0?ownerRatingSum/ownerReviewCount:null;
 const responseTime=product.owner?.responseTimeMinutes;

 return <div className="productPage2"><header className="productTopbar2"><Link href={resultsHref} className="productBack2" aria-label={en?'Back to products':'Tillbaka till produkter'}><BackIcon/></Link></header>
 <section className="productHero2"><div className="productGallery2">{product.images?.length||product.image?<ProductGallery images={product.images?.length?product.images:[product.image!]} alt={`${product.brand} ${product.name}`} badge={product.badge} locale={locale}/>:<ProductVisual kind="cleaner" accent={product.accent}/>}</div><div className="productIdentity2"><h1><span className="productBrand2">{product.brand}</span><span className="productName2">{product.name}</span></h1><div className="productType2">{typeLabel}</div>{hasRentalContext&&pricing?<div className="productPrice2">{pricing.total} kr · {pricing.days} {en?(pricing.days===1?'day':'days'):(pricing.days===1?'dag':'dagar')}</div>:product.price?<div className="productPrice2">{formatPrice(product.price,en)}</div>:null}{shortDescription?<p>{shortDescription}</p>:null}{product.rating!=null&&product.reviewCount!=null?<div className="productRating2" aria-label={`${product.rating} ${en?'out of 5':'av 5'}, ${product.reviewCount} ${en?'reviews':'omdömen'}`}><span aria-hidden="true">★</span><strong>{product.rating.toFixed(1).replace('.',',')}</strong><span>({product.reviewCount} {en?'reviews':'omdömen'})</span></div>:null}</div></section>
 {hasRentalContext&&sp.from?<section className={styles.summaryCard} aria-label={en?'Selected rental period':'Vald hyresperiod'}>
   <details style={{margin:0}}>
    <summary style={{display:'flex',justifyContent:'space-between',gap:18,alignItems:'flex-start',cursor:'pointer',listStyle:'none'}}>
      <div><span className={styles.summaryEyebrow}>{en?'Selected dates':'Valda datum'}</span><strong className={styles.summaryDates}>{formatRentalDate(sp.from,en)}{sp.to&&sp.to!==sp.from?` – ${formatRentalDate(sp.to,en)}`:''}</strong>{sp.place?<span className={styles.summaryPlace}>{sp.place}{sp.radius?` · ${sp.radius} km`:''}</span>:null}</div>
      {pricing?<div style={{textAlign:'right',flex:'0 0 auto'}}><span className={styles.summaryEyebrow}>{en?'Total':'Totalt'}</span><strong className={styles.summaryTotal}>{pricing.total} kr</strong><span className={styles.summaryDetails}>{en?'Show details':'Visa detaljer'} ▾</span></div>:null}
    </summary>
    {pricing?<div className={styles.priceBreakdown}>
      <div><span>{en?`Rental cost for ${pricing.days} ${pricing.days===1?'day':'days'}`:`Hyreskostnad för ${pricing.days} ${pricing.days===1?'dag':'dagar'}`}</span><strong>{pricing.regularRental} kr</strong></div>
      {pricing.discount>0?<div><span>{pricing.hasWeeklyDiscount?(en?`Weekly discount ${pricing.discountPercent}%`:`Veckorabatt ${pricing.discountPercent}%`):(en?`Multi-day discount ${pricing.discountPercent}%`:`Flerdagsrabatt ${pricing.discountPercent}%`)}</span><strong>−{pricing.discount} kr</strong></div>:null}
      <div><span>{en?'Booking fee':'Bokningsavgift'}</span><strong>{pricing.bookingFee} kr</strong></div>
      <div className={styles.priceBreakdownTotal}><strong>{en?'Total':'Totalt'}</strong><strong>{pricing.total} kr</strong></div>
    </div>:null}
   </details>
   <Link href={editSearchHref} className={styles.editSearchLink}>{en?'Change search':'Ändra sökning'}</Link>
  </section>:null}

 {product.owner?.name?<section className={styles.ownerCard} aria-label={en?'About the owner':'Om uthyraren'}>
   <div className={styles.identity}>
     {product.owner.profileImage?<img className={styles.avatar} src={product.owner.profileImage} alt={product.owner.name}/>:<div className={styles.avatarFallback}>{product.owner.name.slice(0,1)}</div>}
     <div className={styles.nameBlock}><span>{en?'Rented out by':'Uthyres av'}</span><strong>{product.owner.name}</strong><div className={styles.verified}><span className={styles.shield}><CheckIcon/></span>{en?'Verified with BankID':'Identifierad via BankID'}</div></div>
   </div>
   <div className={styles.metric}><span className={styles.metricIcon} aria-hidden="true">★</span><div><strong>{ownerRating!=null?ownerRating.toFixed(1).replace('.',','):'–'}</strong><span>{en?'Average rating':'Snittbetyg'}{ownerReviewCount>0?` · ${ownerReviewCount} ${en?'reviews':'omdömen'}`:''}</span></div></div>
   {typeof responseTime==='number'?<div className={styles.metric}><span className={styles.messageIcon} aria-hidden="true">●</span><div><strong>{formatResponseTime(responseTime,en)}</strong></div></div>:null}
 </section>:null}

 <section className="productSections2">{description?<details className="productAccordion2"><summary><span>{en?'Product description':'Produktbeskrivning'}</span><ForwardIcon className="productChevron2"/></summary><div className="productAccordionBody2"><p>{description}</p></div></details>:null}{included.length?<details className="productAccordion2"><summary><span>{en?'Included':'Detta ingår'}</span><ForwardIcon className="productChevron2"/></summary><div className="productAccordionBody2"><ul className="includedList2">{included.map(item=>{const text=en?item.en:item.sv;return <li key={text}><CheckIcon/><span>{text}</span></li>})}</ul></div></details>:null}{specs.length?<details className="productAccordion2"><summary><span>{en?'Specifications':'Specifikationer'}</span><ForwardIcon className="productChevron2"/></summary><div className="productAccordionBody2 productSpecs2">{specs.map(spec=><div key={spec.label.sv}><span>{en?spec.label.en:spec.label.sv}</span><strong>{spec.value}</strong></div>)}</div></details>:null}{product.guideAvailable?<Link className="productGuideRow2" href={`/${locale}/produkter/${product.slug}/guide`}><span>{en?'User guide':'Användarguide'}</span><ForwardIcon/></Link>:null}</section>
 {product.hyggloUrl?<a className="hyggloSecondaryLink2" href={product.hyggloUrl} target="_blank" rel="noreferrer">{en?'View existing listing on Hygglo':'Visa befintlig annons på Hygglo'}</a>:null}</div>
}
