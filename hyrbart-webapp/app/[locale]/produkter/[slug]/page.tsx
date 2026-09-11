import Link from 'next/link';
import { notFound } from 'next/navigation';
import ProductGallery from '@/components/ProductGallery';
import ProductVisual from '@/components/ProductVisual';
import { getProduct, getProducts } from '@/lib/sanity-products';
import { BackIcon, CheckIcon, ForwardIcon } from '@/components/Icons';
import styles from './owner-card.module.css';

function firstSentence(text?:string){if(!text)return'';const normalized=text.replace(/\s+/g,' ').trim(),match=normalized.match(/^(.+?[.!?])(?:\s|$)/);return(match?.[1]??normalized).slice(0,190)}
function formatPrice(price:string,en:boolean){if(!en)return price;return price.replace(/^fr\.\s*/i,'from ').replace(/\s*kr\/dygn$/i,' SEK/day')}
function dailyNumber(price:string){const match=price.match(/([0-9]+(?:[.,][0-9]+)?)/);return match?Number(match[1].replace(',','.')):null}
function rentalDays(from?:string,to?:string){if(!from)return null;const start=new Date(`${from}T12:00:00`),end=new Date(`${to||from}T12:00:00`);return Math.max(1,Math.round((end.getTime()-start.getTime())/86400000)+1)}
function formatRentalDate(value:string,en:boolean){return new Intl.DateTimeFormat(en?'en-GB':'sv-SE',{day:'numeric',month:'short'}).format(new Date(`${value}T12:00:00`)).replace('.','.')}
function bestRentalCost(days:number,daily:number,prices?:Array<{days:number;price:number}>){const tiers=[{days:1,price:daily},...(prices??[]).filter(p=>p.days>1&&p.price>0)];const dp=Array(days+1).fill(Number.POSITIVE_INFINITY);dp[0]=0;for(let d=1;d<=days;d++)for(const tier of tiers)if(tier.days<=d)dp[d]=Math.min(dp[d],dp[d-tier.days]+tier.price);return Number.isFinite(dp[days])?Math.round(dp[days]):Math.round(days*daily)}
type SearchContext={q?:string;category?:string;from?:string;to?:string;place?:string;radius?:string};

export default async function GenericProductPage({params,searchParams}:{params:Promise<{locale:string;slug:string}>;searchParams:Promise<SearchContext>}){
 const {locale,slug}=await params,sp=await searchParams,en=locale==='en';
 const [product,allProducts]=await Promise.all([getProduct(slug),getProducts()]);if(!product)notFound();
 const typeLabel=en?product.typeEn??product.type:product.type,description=product.description?(en?product.description.en:product.description.sv):'',shortDescription=firstSentence(description),included=product.included??[],specs=product.specifications??[];
 const days=rentalDays(sp.from,sp.to),daily=product.price?dailyNumber(product.price):null,regularRental=days&&daily?Math.round(days*daily):null,rentalCost=days&&daily?bestRentalCost(days,daily,product.rentalPrices):null,discount=regularRental&&rentalCost?Math.max(0,regularRental-rentalCost):0,discountPercent=regularRental&&discount?Math.round(discount/regularRental*100):0,hasWeeklyDiscount=Boolean(days&&days>=7&&product.rentalPrices?.some(p=>p.days>=7&&daily&&p.price<p.days*daily)),bookingFee=9,grandTotal=rentalCost!=null?rentalCost+bookingFee:null,hasRentalContext=Boolean(sp.from),resultsParams=new URLSearchParams();
 if(sp.q)resultsParams.set('q',sp.q);if(sp.category)resultsParams.set('category',sp.category);if(sp.from)resultsParams.set('from',sp.from);if(sp.to)resultsParams.set('to',sp.to);if(sp.place)resultsParams.set('place',sp.place);if(sp.radius)resultsParams.set('radius',sp.radius);
 const resultsHref=`/${locale}/produkter${resultsParams.size?`?${resultsParams.toString()}`:''}`,editParams=new URLSearchParams(resultsParams);editParams.set('edit','1');const editSearchHref=`/${locale}/produkter?${editParams.toString()}`;
 const ownerProducts=product.owner?.id?allProducts.filter(p=>p.owner?.id===product.owner?.id):[];
 const ownerReviewCount=ownerProducts.reduce((sum,p)=>sum+(p.reviewCount??0),0);
 const ownerRatingSum=ownerProducts.reduce((sum,p)=>sum+((p.rating??0)*(p.reviewCount??0)),0);
 const ownerRating=ownerReviewCount>0?ownerRatingSum/ownerReviewCount:null;

 return <div className="productPage2"><header className="productTopbar2"><Link href={resultsHref} className="productBack2" aria-label={en?'Back to products':'Tillbaka till produkter'}><BackIcon/></Link></header>
 <section className="productHero2"><div className="productGallery2">{product.images?.length||product.image?<ProductGallery images={product.images?.length?product.images:[product.image!]} alt={`${product.brand} ${product.name}`} badge={product.badge} locale={locale}/>:<ProductVisual kind="cleaner" accent={product.accent}/>}</div><div className="productIdentity2"><h1><span className="productBrand2">{product.brand}</span><span className="productName2">{product.name}</span></h1><div className="productType2">{typeLabel}</div>{hasRentalContext&&rentalCost&&days?<div className="productPrice2">{rentalCost} kr · {days} {en?(days===1?'day':'days'):(days===1?'dag':'dagar')}</div>:product.price?<div className="productPrice2">{formatPrice(product.price,en)}</div>:null}{shortDescription?<p>{shortDescription}</p>:null}{product.rating!=null&&product.reviewCount!=null?<div className="productRating2" aria-label={`${product.rating} ${en?'out of 5':'av 5'}, ${product.reviewCount} ${en?'reviews':'omdömen'}`}><span aria-hidden="true">★</span><strong>{product.rating.toFixed(1).replace('.',',')}</strong><span>({product.reviewCount} {en?'reviews':'omdömen'})</span></div>:null}</div></section>
 {hasRentalContext&&sp.from?<section className={styles.summaryCard} aria-label={en?'Selected rental period':'Vald hyresperiod'}>
   <details style={{margin:0}}>
    <summary style={{display:'flex',justifyContent:'space-between',gap:18,alignItems:'flex-start',cursor:'pointer',listStyle:'none'}}>
      <div><span className={styles.summaryEyebrow}>{en?'Selected dates':'Valda datum'}</span><strong className={styles.summaryDates}>{formatRentalDate(sp.from,en)}{sp.to&&sp.to!==sp.from?` – ${formatRentalDate(sp.to,en)}`:''}</strong>{sp.place?<span className={styles.summaryPlace}>{sp.place}{sp.radius?` · ${sp.radius} km`:''}</span>:null}</div>
      {grandTotal!=null?<div style={{textAlign:'right',flex:'0 0 auto'}}><span className={styles.summaryEyebrow}>{en?'Total':'Totalt'}</span><strong className={styles.summaryTotal}>{grandTotal} kr</strong><span className={styles.summaryDetails}>{en?'Show details':'Visa detaljer'} ▾</span></div>:null}
    </summary>
    {days&&regularRental!=null&&rentalCost!=null&&grandTotal!=null?<div className={styles.priceBreakdown}>
      <div><span>{en?`Rental cost for ${days} ${days===1?'day':'days'}`:`Hyreskostnad för ${days} ${days===1?'dag':'dagar'}`}</span><strong>{regularRental} kr</strong></div>
      {discount>0?<div><span>{hasWeeklyDiscount?(en?`Weekly discount ${discountPercent}%`:`Veckorabatt ${discountPercent}%`):(en?`Multi-day discount ${discountPercent}%`:`Flerdagsrabatt ${discountPercent}%`)}</span><strong>−{discount} kr</strong></div>:null}
      <div><span>{en?'Booking fee':'Bokningsavgift'}</span><strong>{bookingFee} kr</strong></div>
      <div className={styles.priceBreakdownTotal}><strong>{en?'Total':'Totalt'}</strong><strong>{grandTotal} kr</strong></div>
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
   <div className={styles.metric}><span className={styles.messageIcon} aria-hidden="true">●</span><div><strong>{en?'Usually replies within 1 hour':'Svarar oftast inom 1 timme'}</strong></div></div>
 </section>:null}

 <section className="productSections2">{description?<details className="productAccordion2"><summary><span>{en?'Product description':'Produktbeskrivning'}</span><ForwardIcon className="productChevron2"/></summary><div className="productAccordionBody2"><p>{description}</p></div></details>:null}{included.length?<details className="productAccordion2"><summary><span>{en?'Included':'Detta ingår'}</span><ForwardIcon className="productChevron2"/></summary><div className="productAccordionBody2"><ul className="includedList2">{included.map(item=>{const text=en?item.en:item.sv;return <li key={text}><CheckIcon/><span>{text}</span></li>})}</ul></div></details>:null}{specs.length?<details className="productAccordion2"><summary><span>{en?'Specifications':'Specifikationer'}</span><ForwardIcon className="productChevron2"/></summary><div className="productAccordionBody2 productSpecs2">{specs.map(spec=><div key={spec.label.sv}><span>{en?spec.label.en:spec.label.sv}</span><strong>{spec.value}</strong></div>)}</div></details>:null}{product.guideAvailable?<Link className="productGuideRow2" href={`/${locale}/produkter/${product.slug}/guide`}><span>{en?'User guide':'Användarguide'}</span><ForwardIcon/></Link>:null}</section>
 {product.hyggloUrl?<a className="hyggloSecondaryLink2" href={product.hyggloUrl} target="_blank" rel="noreferrer">{en?'View existing listing on Hygglo':'Visa befintlig annons på Hygglo'}</a>:null}</div>
}
