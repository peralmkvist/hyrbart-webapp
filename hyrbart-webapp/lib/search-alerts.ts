import 'server-only';
import { createAdminClient } from '@/lib/supabase/admin';
import { getProducts, getUnavailableProductSlugs } from '@/lib/sanity-products';
import { getUnavailableProductIds } from '@/lib/supabase-bookings';
import { getProductReviewSummaries } from '@/lib/review-summaries';
import { categoryBelongsToRoot, categorySearchTerms } from '@/lib/discovery-taxonomy';
import { calculateRentalPricing } from '@/lib/rental-pricing';
import { distanceKm } from '@/lib/geo';
import { notifyUser } from '@/lib/notifications';

export type SearchAlertRow = {
  id: string;
  user_id: string;
  status: 'active' | 'paused' | 'expired';
  query_text: string | null;
  category: string | null;
  place: string | null;
  center_lat: number | null;
  center_lng: number | null;
  radius_km: number;
  start_date: string;
  end_date: string;
  max_total_price: number | null;
  min_rating: number | null;
  discount_only: boolean;
  locale: 'sv' | 'en';
  notification_channel: 'in_app' | 'in_app_push';
};

type MatchRow = { id:string; alert_id:string; product_key:string; last_signature:string|null; is_matching:boolean; last_matched_at:string|null; last_notified_at:string|null };
function normalize(value?: string | null){return (value||'').trim().toLocaleLowerCase('sv-SE')}
function hasDiscount(product:{discounts?:{multiDayPercent?:number;weeklyPercent?:number;repeatCustomerPercent?:number}}){return Boolean((product.discounts?.multiDayPercent||0)>0||(product.discounts?.weeklyPercent||0)>0||(product.discounts?.repeatCustomerPercent||0)>0)}

export function searchAlertUrl(alert:SearchAlertRow){const p=new URLSearchParams();if(alert.query_text)p.set('q',alert.query_text);if(alert.category)p.set('category',alert.category);p.set('from',alert.start_date);p.set('to',alert.end_date);if(alert.place)p.set('place',alert.place);if(alert.center_lat!=null&&alert.center_lng!=null){p.set('lat',String(alert.center_lat));p.set('lng',String(alert.center_lng));p.set('geo','saved')}p.set('radius',String(alert.radius_km));if(alert.max_total_price!=null)p.set('maxPrice',String(alert.max_total_price));if(alert.min_rating!=null)p.set('minRating',String(alert.min_rating));if(alert.discount_only)p.set('discountOnly','1');return `/${alert.locale}/produkter?${p.toString()}`}
function dateToday(){return new Date().toISOString().slice(0,10)}

async function sendSearchAlertNotification(alert:SearchAlertRow,input:{title:string;body:string;url:string;eventKey:string;metadata:Record<string,unknown>}){
  if(alert.notification_channel==='in_app_push')return notifyUser({userId:alert.user_id,type:'search_alert_match',...input,sendEmail:false});
  const admin=createAdminClient();
  const {error}=await admin.from('user_notifications').insert({user_id:alert.user_id,booking_id:null,notification_type:'search_alert_match',title:input.title,body:input.body,url:input.url,event_key:input.eventKey,metadata:{...input.metadata,preference_category:'search_alert'},in_app_visible:true,push_status:'skipped',push_last_error:'disabled_for_saved_search',email_status:'skipped',email_last_error:'email_disabled_for_event'});
  if(error&&error.code!=='23505')throw error;
  return null;
}

export async function evaluateSearchAlert(alert:SearchAlertRow,options:{notify?:boolean}={}){
  const notify=options.notify!==false;
  const admin=createAdminClient(),now=new Date().toISOString();
  if(alert.status!=='active')return{evaluated:false,notifications:0,matches:0};
  if(alert.start_date<dateToday()){await admin.from('search_alerts').update({status:'expired',updated_at:now,last_evaluated_at:now}).eq('id',alert.id);return{evaluated:true,expired:true,notifications:0,matches:0}}
  const products=await getProducts();
  const reviewSummaries=alert.min_rating!=null?await getProductReviewSummaries(products.flatMap(product=>product.id?[product.id]:[])):{};
  const [legacyUnavailable,bookedIds,existingResult]=await Promise.all([getUnavailableProductSlugs(alert.start_date,alert.end_date),getUnavailableProductIds(alert.start_date,alert.end_date),admin.from('search_alert_matches').select('*').eq('alert_id',alert.id)]);
  if(existingResult.error)throw existingResult.error;
  const existing=new Map((existingResult.data||[]).map(row=>[row.product_key,row as MatchRow]));
  const query=normalize(alert.query_text),center=alert.center_lat!=null&&alert.center_lng!=null?{lat:alert.center_lat,lng:alert.center_lng}:null,seen=new Set<string>();
  let notifications=0,matches=0;
  for(const product of products){
    if(alert.category&&!categoryBelongsToRoot(product.category,alert.category))continue;
    if(query){const terms=[product.brand,product.name,product.type,product.typeEn,product.category,...categorySearchTerms(product.category)].map(normalize).join(' ');if(!terms.includes(query))continue}
    if(legacyUnavailable.has(product.slug)||(product.id&&bookedIds.has(product.id)))continue;
    if(center){if(!product.pickupLocation)continue;if(distanceKm(center,{lat:product.pickupLocation.lat,lng:product.pickupLocation.lng})>alert.radius_km)continue}
    const pricing=calculateRentalPricing(product.price,alert.start_date,alert.end_date,product.rentalPrices,product.discounts);if(!pricing)continue;
    if(alert.max_total_price!=null&&pricing.total>alert.max_total_price)continue;
    if(alert.min_rating!=null){const review=product.id?reviewSummaries[product.id]:undefined;if(!review?.count||review.overall==null||review.overall<alert.min_rating)continue}
    if(alert.discount_only&&!hasDiscount(product))continue;
    matches+=1;seen.add(product.slug);
    const signature=`${pricing.total}|${alert.start_date}|${alert.end_date}`,previous=existing.get(product.slug),shouldNotify=notify&&(!previous?.is_matching||previous.last_signature!==signature);
    const {data:stored,error:upsertError}=await admin.from('search_alert_matches').upsert({alert_id:alert.id,product_key:product.slug,last_signature:signature,is_matching:true,last_matched_at:now,updated_at:now},{onConflict:'alert_id,product_key'}).select('id').single();
    if(upsertError)throw upsertError;
    if(shouldNotify){const en=alert.locale==='en',title=en?'A watched rental is available':'En bevakad uthyrning är ledig',body=en?`${product.brand} ${product.name} now matches your dates and price limit. Availability and price are checked again when you open the result; this is not a reservation.`:`${product.brand} ${product.name} matchar nu dina datum och ditt maxpris. Tillgänglighet och pris kontrolleras igen när du öppnar resultatet; detta är ingen reservation.`;await sendSearchAlertNotification(alert,{title,body,url:searchAlertUrl(alert),eventKey:`search-alert:${alert.id}:${product.slug}:${signature}:${stored.id}:${now}`,metadata:{search_alert_id:alert.id,product_slug:product.slug,total_price:pricing.total}});await admin.from('search_alert_matches').update({last_notified_at:now}).eq('id',stored.id);notifications+=1}
  }
  for(const [key,row] of existing){if(!seen.has(key)&&row.is_matching)await admin.from('search_alert_matches').update({is_matching:false,updated_at:now}).eq('id',row.id)}
  await admin.from('search_alerts').update({last_evaluated_at:now,updated_at:now}).eq('id',alert.id);
  return{evaluated:true,notifications,matches};
}

export async function evaluateActiveSearchAlerts(limit=100){const admin=createAdminClient();const{data,error}=await admin.from('search_alerts').select('*').eq('status','active').order('last_evaluated_at',{ascending:true,nullsFirst:true}).limit(limit);if(error)throw error;let notifications=0,evaluated=0,expired=0;for(const row of data||[]){const result=await evaluateSearchAlert(row as SearchAlertRow);if(result.evaluated)evaluated+=1;if(result.expired)expired+=1;notifications+=result.notifications}return{evaluated,expired,notifications}}
