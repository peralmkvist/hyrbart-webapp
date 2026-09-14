import { createHash } from 'node:crypto';
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { geocodeSwedishPlace } from '@/lib/geo';
import { evaluateSearchAlert, type SearchAlertRow } from '@/lib/search-alerts';

type AlertInput = {
  query?: string;
  category?: string;
  place?: string;
  radius?: number | string;
  from?: string;
  to?: string;
  maxPrice?: number | string;
  minRating?: number | string;
  discountOnly?: boolean;
  locale?: string;
  notificationChannel?: string;
};

function dateValue(value: unknown) { const text=String(value||''); return /^\d{4}-\d{2}-\d{2}$/.test(text)?text:''; }
function canonical(input:AlertInput){const from=dateValue(input.from),to=dateValue(input.to||input.from),radius=Math.max(1,Math.min(50,Number(input.radius||10)||10)),maxPrice=Number(input.maxPrice||0)>0?Math.round(Number(input.maxPrice)):null,minRating=Number(input.minRating||0)>0?Math.max(0,Math.min(5,Number(input.minRating))):null;return{query:String(input.query||'').trim(),category:String(input.category||'').trim(),place:String(input.place||'').trim(),radius,from,to,maxPrice,minRating,discountOnly:Boolean(input.discountOnly),locale:input.locale==='en'?'en':'sv',notificationChannel:input.notificationChannel==='in_app'?'in_app':'in_app_push'}}
function criteriaHash(criteria:ReturnType<typeof canonical>){return createHash('sha256').update(JSON.stringify(criteria)).digest('hex')}
function validCriteria(c:ReturnType<typeof canonical>){if(!c.from||!c.to||c.to<c.from)return'INVALID_DATES';if(!c.query&&!c.category)return'PRODUCT_CRITERIA_REQUIRED';if(!c.place)return'LOCATION_REQUIRED';if(c.from<new Date().toISOString().slice(0,10))return'PAST_PERIOD';return null}
function dbCriteria(c:ReturnType<typeof canonical>,center:{lat:number;lng:number}|null){return{query_text:c.query||null,category:c.category||null,place:c.place||null,center_lat:center?.lat??null,center_lng:center?.lng??null,radius_km:c.radius,start_date:c.from,end_date:c.to,max_total_price:c.maxPrice,min_rating:c.minRating,discount_only:c.discountOnly,locale:c.locale,notification_channel:c.notificationChannel,criteria_hash:criteriaHash(c)}}

export async function GET(){const supabase=await createClient(),{data:{user}}=await supabase.auth.getUser();if(!user)return NextResponse.json({error:'UNAUTHENTICATED'},{status:401});const{data,error}=await supabase.from('search_alerts').select('*').eq('user_id',user.id).order('created_at',{ascending:false});if(error)return NextResponse.json({error:'LOAD_FAILED'},{status:500});return NextResponse.json({alerts:data||[]},{headers:{'cache-control':'no-store'}})}

export async function POST(request:Request){
 const supabase=await createClient(),{data:{user}}=await supabase.auth.getUser();if(!user)return NextResponse.json({error:'UNAUTHENTICATED'},{status:401});
 const body=await request.json().catch(()=>({})) as AlertInput,c=canonical(body),invalid=validCriteria(c);if(invalid)return NextResponse.json({error:invalid},{status:400});
 const center=await geocodeSwedishPlace(c.place);if(!center)return NextResponse.json({error:'LOCATION_NOT_FOUND'},{status:400});
 const row=dbCriteria(c,center),admin=createAdminClient(),{data:existing}=await admin.from('search_alerts').select('*').eq('user_id',user.id).eq('criteria_hash',row.criteria_hash).maybeSingle();if(existing)return NextResponse.json({alert:existing,duplicate:true});
 const{data,error}=await admin.from('search_alerts').insert({user_id:user.id,...row}).select('*').single();if(error)return NextResponse.json({error:'SAVE_FAILED'},{status:500});
 await evaluateSearchAlert(data as SearchAlertRow,{notify:false}).catch(error=>console.error('Could not prime search alert',error));
 const {data:refreshed}=await admin.from('search_alerts').select('*').eq('id',data.id).single();
 return NextResponse.json({alert:refreshed||data},{status:201});
}

export async function PATCH(request:Request){
 const supabase=await createClient(),{data:{user}}=await supabase.auth.getUser();if(!user)return NextResponse.json({error:'UNAUTHENTICATED'},{status:401});
 const body=await request.json().catch(()=>({})) as AlertInput&{id?:string;status?:string},id=String(body.id||'');if(!id)return NextResponse.json({error:'ID_REQUIRED'},{status:400});
 const{data:current,error:currentError}=await supabase.from('search_alerts').select('*').eq('id',id).eq('user_id',user.id).maybeSingle();if(currentError)return NextResponse.json({error:'LOAD_FAILED'},{status:500});if(!current)return NextResponse.json({error:'NOT_FOUND'},{status:404});
 const criteriaFields=['query','category','place','radius','from','to','maxPrice','minRating','discountOnly','locale','notificationChannel'] as const,changesCriteria=criteriaFields.some(key=>Object.prototype.hasOwnProperty.call(body,key)),patch:Record<string,unknown>={updated_at:new Date().toISOString()};
 if(changesCriteria){const merged=canonical({query:body.query??current.query_text??'',category:body.category??current.category??'',place:body.place??current.place??'',radius:body.radius??current.radius_km,from:body.from??current.start_date,to:body.to??current.end_date,maxPrice:body.maxPrice!==undefined?body.maxPrice:current.max_total_price??'',minRating:body.minRating!==undefined?body.minRating:current.min_rating??'',discountOnly:body.discountOnly!==undefined?body.discountOnly:current.discount_only,locale:body.locale??current.locale,notificationChannel:body.notificationChannel??current.notification_channel}),invalid=validCriteria(merged);if(invalid)return NextResponse.json({error:invalid},{status:400});const center=await geocodeSwedishPlace(merged.place);if(!center)return NextResponse.json({error:'LOCATION_NOT_FOUND'},{status:400});Object.assign(patch,dbCriteria(merged,center))}
 if(body.status==='active'||body.status==='paused')patch.status=body.status;
 const{data,error}=await supabase.from('search_alerts').update(patch).eq('id',id).eq('user_id',user.id).select('*').maybeSingle();if(error?.code==='23505')return NextResponse.json({error:'DUPLICATE_ALERT'},{status:409});if(error)return NextResponse.json({error:'SAVE_FAILED'},{status:500});if(!data)return NextResponse.json({error:'NOT_FOUND'},{status:404});
 if(changesCriteria){const admin=createAdminClient();await admin.from('search_alert_matches').delete().eq('alert_id',id);await evaluateSearchAlert(data as SearchAlertRow,{notify:false}).catch(error=>console.error('Could not re-prime search alert',error));const{data:refreshed}=await admin.from('search_alerts').select('*').eq('id',id).single();return NextResponse.json({alert:refreshed||data})}
 return NextResponse.json({alert:data});
}

export async function DELETE(request:Request){const supabase=await createClient(),{data:{user}}=await supabase.auth.getUser();if(!user)return NextResponse.json({error:'UNAUTHENTICATED'},{status:401});const body=await request.json().catch(()=>({})) as{id?:string},id=String(body.id||'');if(!id)return NextResponse.json({error:'ID_REQUIRED'},{status:400});const{error}=await supabase.from('search_alerts').delete().eq('id',id).eq('user_id',user.id);if(error)return NextResponse.json({error:'DELETE_FAILED'},{status:500});return NextResponse.json({ok:true})}
