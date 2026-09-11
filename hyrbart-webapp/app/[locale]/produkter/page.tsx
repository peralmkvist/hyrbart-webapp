import Link from 'next/link';
import { getProducts, getUnavailableProductSlugs } from '@/lib/sanity-products';
import { distanceKm, geocodeSwedishPlace } from '@/lib/geo';
import ProductVisual from '@/components/ProductVisual';
import ProductSearchForm from '@/components/ProductSearchForm';
import SearchResults from '@/components/SearchResults';
import { CategoryIcon } from '@/components/Icons';

const categoryDefinitions = [
  { value: 'Barnartiklar', sv: 'Barnartiklar', en: 'Baby & kids' }, { value: 'Belysning', sv: 'Belysning', en: 'Lighting' }, { value: 'Biltillbehör', sv: 'Biltillbehör', en: 'Car accessories' }, { value: 'Borra & Skruva', sv: 'Borra & Skruva', en: 'Drilling & screwdriving' }, { value: 'Handverktyg', sv: 'Handverktyg', en: 'Hand tools' }, { value: 'Hem & hushåll', sv: 'Hem & hushåll', en: 'Home & household' }, { value: 'Håltagning', sv: 'Håltagning', en: 'Hole making' }, { value: 'Kontor', sv: 'Kontor', en: 'Office' }, { value: 'Luftverktyg', sv: 'Luftverktyg', en: 'Air tools' }, { value: 'Mäta', sv: 'Mäta', en: 'Measuring' }, { value: 'Städa & Tvätta', sv: 'Städa & Tvätta', en: 'Cleaning & washing' }, { value: 'Såga & Slipa', sv: 'Såga & Slipa', en: 'Sawing & sanding' }, { value: 'Trädgård', sv: 'Trädgård', en: 'Garden' }, { value: 'Värme', sv: 'Värme', en: 'Heating' },
];
function normalize(v:string|undefined){return(v??'').trim().toLocaleLowerCase('sv')}
function dailyNumber(price:string){const m=price.match(/([0-9]+(?:[.,][0-9]+)?)/);return m?Number(m[1].replace(',','.')):null}
function daysBetween(a?:string,b?:string){if(!a||!b)return null;const x=new Date(`${a}T12:00:00`),y=new Date(`${b}T12:00:00`);return Math.max(1,Math.round((y.getTime()-x.getTime())/86400000)+1)}

export default async function ProductsPage({params,searchParams}:{params:Promise<{locale:string}>;searchParams:Promise<{category?:string;q?:string;from?:string;to?:string;place?:string;radius?:string}>}){
 const {locale}=await params;
 const sp=await searchParams;
 const {category,q,from,to,place,radius}=sp;
 const en=locale==='en';
 const [products, unavailableSlugs]=await Promise.all([getProducts(),getUnavailableProductSlugs(from,to)]);
 const selectedCategory=categoryDefinitions.some(i=>i.value===category)?category:undefined;
 const query=normalize(q);
 const days=daysBetween(from,to);
 const searched=Boolean(query||from||to||place);
 const searchPlace=place?.trim()||'Danderyd';
 const searchRadius=Math.max(1,Math.min(50,Number(radius||10)||10));
 const searchCenter=searched?await geocodeSwedishPlace(searchPlace):null;

 const filtered=products
  .filter(p=>{
    if(from&&unavailableSlugs.has(p.slug))return false;
    if(selectedCategory&&p.category!==selectedCategory)return false;
    if(query){const c=categoryDefinitions.find(i=>i.value===p.category);if(![p.brand,p.name,p.type,p.typeEn,p.category,c?.sv,c?.en].map(normalize).join(' ').includes(query))return false;}
    if(searched&&searchCenter){
      const point=p.pickupLocation;
      if(!point)return false;
      return distanceKm(searchCenter,{lat:point.lat,lng:point.lng})<=searchRadius;
    }
    return true;
  })
  .sort((a,b)=>{
    if(searchCenter&&a.pickupLocation&&b.pickupLocation){
      const da=distanceKm(searchCenter,{lat:a.pickupLocation.lat,lng:a.pickupLocation.lng});
      const db=distanceKm(searchCenter,{lat:b.pickupLocation.lat,lng:b.pickupLocation.lng});
      if(Math.abs(da-db)>.01)return da-db;
    }
    return(en?(a.typeEn??a.type):a.type).localeCompare(en?(b.typeEn??b.type):b.type,en?'en':'sv',{sensitivity:'base'});
  });

 const keep=(value?:string)=>{const p=new URLSearchParams();if(value)p.set('category',value);if(q)p.set('q',q);if(from)p.set('from',from);if(to)p.set('to',to);if(place)p.set('place',place);if(radius)p.set('radius',radius);return`/${locale}/produkter?${p}`};
 const resultItems=filtered.map(p=>{const daily=dailyNumber(p.price);const total=daily&&days?Math.round(daily*days):null;const params=new URLSearchParams({...(from?{from}:{}),...(to?{to}:{}),...(place?{place}:{}),...(radius?{radius}:{})});const point=p.pickupLocation;const distance=searchCenter&&point?distanceKm(searchCenter,{lat:point.lat,lng:point.lng}):undefined;return{slug:p.slug,href:`/${locale}/produkter/${p.slug}${searched?`?${params.toString()}`:''}`,brand:p.brand,name:p.name,type:en?(p.typeEn??p.type):p.type,image:p.image,accent:p.accent,priceLabel:total?`${total} kr · ${days} ${en?'days':'dagar'}`:p.price,mapLabel:total?`${total} kr`:(daily?`${daily} kr`:p.price),lat:point?.lat,lng:point?.lng,distanceKm:distance};});
 const metaLabel=`${filtered.length} ${en?'products':'produkter'}`;
 const locationUnavailable=searched&&!searchCenter;
 const noAvailability=Boolean(from&&products.length>0&&filtered.length===0&&unavailableSlugs.size>0);

 return <div className="pageShell rentPage2"><div className="rentSticky2"><header className="brandHeader2"><Link href={`/${locale}`} className="hyrbartWordmark2"><span className="hyrbartWordmarkH2">H<i/></span><span>yrbart</span></Link></header><section className="homeIntro2 rentIntro2"><h1>{en?'What do you want to rent?':'Vad vill du hyra?'}</h1><ProductSearchForm locale={locale} initialQuery={q??''} category={selectedCategory} initialFrom={from??''} initialTo={to??''} initialPlace={place??'Danderyd'} initialRadius={radius??'10'} initiallyCollapsed={searched}/></section><div className="categoryStrip2"><Link href={keep()} className={!selectedCategory?'categoryChip2 active':'categoryChip2'}>{en?'All':'Alla'}</Link>{categoryDefinitions.map(i=><Link key={i.value} href={keep(i.value)} className={selectedCategory===i.value?'categoryChip2 active':'categoryChip2'}>{en?i.en:i.sv}</Link>)}</div></div>
 {locationUnavailable?<section className="rentEmpty2"><h2>{en?'Location not found':'Platsen hittades inte'}</h2><p>{en?'Try a city, district or postcode in Sweden.':'Testa en ort, stadsdel eller ett postnummer i Sverige.'}</p></section>:filtered.length?(searched?<SearchResults locale={locale} place={searchPlace} radius={searchRadius} center={searchCenter!} items={resultItems} metaLabel={metaLabel} clearHref={`/${locale}/produkter`}/>:<><div className="rentMeta2"><span>{metaLabel}</span>{(selectedCategory||query)&&<Link href={`/${locale}/produkter`}>{en?'Clear filters':'Rensa filter'}</Link>}</div><section className="productGrid2">{filtered.map(p=><Link href={`/${locale}/produkter/${p.slug}`} className="productTile2" key={p.slug}><div className="productTileVisual2"><ProductVisual kind="cleaner" accent={p.accent} imageSrc={p.image} imageAlt={`${p.brand} ${p.name}`}/></div><div className="productTileCopy2"><strong>{p.brand} {p.name}</strong><span>{en?(p.typeEn??p.type):p.type}</span><b>{p.price}</b></div></Link>)}</section></>):<section className="rentEmpty2"><h2>{noAvailability?(en?'Nothing available for these dates':'Inget ledigt de här datumen'):(en?'No matches within the radius':'Inga träffar inom radien')}</h2><p>{noAvailability?(en?'Try changing the dates to see more products.':'Prova att ändra datumen för att se fler produkter.'):(en?'Try increasing the radius or changing the location.':'Prova att öka sökradien eller ändra plats.')}</p></section>}
 {!selectedCategory&&!query&&!searched&&<section className="categoryOverview2">{categoryDefinitions.map(i=><Link key={i.value} href={`/${locale}/produkter?category=${encodeURIComponent(i.value)}`}><CategoryIcon category={i.value}/><span>{en?i.en:i.sv}</span></Link>)}</section>}</div>
}
