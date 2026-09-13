import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getProduct, getProducts } from '@/lib/sanity-products';
import { calculateRentalPricing } from '@/lib/rental-pricing';
import { sendPushToUser } from '@/lib/push';
import { recordBookingEvent } from '@/lib/booking-events';
import { RENTAL_TERMS_VERSION, normalizeTermsLocale } from '@/lib/legal';

export const runtime = 'nodejs';

function range(from:string,to:string){
  const format=(value:string)=>new Intl.DateTimeFormat('sv-SE',{day:'numeric',month:'short',timeZone:'UTC'}).format(new Date(`${value}T12:00:00Z`));
  return `${format(from)} – ${format(to)}`;
}

export async function GET(){
  try{
    const supabase=await createClient();
    const admin=createAdminClient();
    const {data:{user}}=await supabase.auth.getUser();
    if(!user)return NextResponse.json({error:'Inte inloggad.'},{status:401});

    const [{data,error},products]=await Promise.all([
      supabase.from('bookings').select('*').or(`renter_id.eq.${user.id},owner_id.eq.${user.id}`).order('created_at',{ascending:false}).limit(50),
      getProducts(),
    ]);
    if(error)throw error;
    const rows=data??[];
    const ids=Array.from(new Set(rows.map(row=>row.owner_id===user.id?row.renter_id:row.owner_id).filter(Boolean)));
    const profiles=new Map<string,any>();
    if(ids.length){
      const {data:profileRows}=await admin.from('profiles').select('id,display_name').in('id',ids);
      for(const profile of profileRows??[])profiles.set(profile.id,profile);
    }

    const bookingIds=rows.map(row=>row.id);
    const latest=new Map<string,any>();
    const unread=new Set<string>();
    if(bookingIds.length){
      const {data:messages}=await admin.from('booking_messages').select('booking_id,body,created_at,sender_id,read_at').in('booking_id',bookingIds).order('created_at',{ascending:false});
      for(const message of messages??[]){
        if(!latest.has(message.booking_id))latest.set(message.booking_id,message);
        if(message.sender_id!==user.id&&!message.read_at)unread.add(message.booking_id);
      }
    }

    const requests=rows.map(row=>{
      const product=products.find(item=>item.id===row.product_id);
      const role=row.owner_id===user.id?'owner':'renter';
      const counterpart=profiles.get(role==='owner'?row.renter_id:row.owner_id);
      const lastMessage=latest.get(row.id);
      return {
        id:row.id,from:row.start_date,to:row.end_date,requestType:row.request_type,message:row.message,
        status:row.status,createdAt:row.created_at,role,
        product:product?[product.brand,product.name].filter(Boolean).join(' '):'Produkt',
        participantName:counterpart?.display_name||(role==='owner'?'Hyrare':'Uthyrare'),
        latestMessage:lastMessage?.body||null,latestMessageAt:lastMessage?.created_at||null,unreadMessage:unread.has(row.id),
      };
    }).sort((a,b)=>new Date(b.latestMessageAt||b.createdAt).getTime()-new Date(a.latestMessageAt||a.createdAt).getTime());

    return NextResponse.json({requests});
  }catch(error){
    console.error(error);
    return NextResponse.json({error:'Kunde inte läsa bokningsförfrågningar.'},{status:500});
  }
}

export async function POST(request:Request){
  let body:any;
  try{body=await request.json();}catch{return NextResponse.json({error:'Ogiltig förfrågan.'},{status:400});}
  const {slug,from,to,requestType='booking',message='',startTime='12:00',locale='sv'}=body;
  const datePattern=/^\d{4}-\d{2}-\d{2}$/;
  const timePattern=/^([01]\d|2[0-3]):[0-5]\d$/;
  if(!slug||!from||!to||!datePattern.test(from)||!datePattern.test(to)||from>to||!['booking','reserve-question'].includes(requestType)||!timePattern.test(startTime)){
    return NextResponse.json({error:'Ogiltiga bokningsuppgifter.'},{status:400});
  }
  if(requestType==='reserve-question'&&!message.trim())return NextResponse.json({error:'Skriv din fråga innan du reserverar.'},{status:400});

  try{
    const supabase=await createClient();
    const admin=createAdminClient();
    const {data:{user}}=await supabase.auth.getUser();
    if(!user)return NextResponse.json({error:'Logga in för att skicka en bokningsförfrågan.'},{status:401});

    const {data:renterProfile}=await admin.from('profiles').select('payment_method_ready').eq('id',user.id).maybeSingle();
    if(!renterProfile?.payment_method_ready)return NextResponse.json({error:'Lägg till en betalningsmetod innan du kan boka.',code:'PAYMENT_METHOD_REQUIRED'},{status:409});

    const product=await getProduct(slug);
    if(!product?.id||!product.owner?.id)return NextResponse.json({error:'Annonsen eller uthyraren hittades inte.'},{status:404});
    const {data:owner}=await admin.from('profiles').select('id').eq('sanity_profile_id',product.owner.id).maybeSingle();
    if(!owner?.id)return NextResponse.json({error:'Uthyraren har ännu inget Hyrbart-konto.'},{status:409});
    if(owner.id===user.id)return NextResponse.json({error:'Du kan inte boka din egen annons.'},{status:400});

    const pricing=calculateRentalPricing(product.price,from,to,product.rentalPrices,product.discounts);
    if(!pricing)return NextResponse.json({error:'Kunde inte beräkna priset.'},{status:409});

    const {data:overlap}=await admin.from('bookings').select('id').eq('product_id',product.id).lte('start_date',to).gte('end_date',from).in('status',['requested','reserved','accepted','paid','active','returned']);
    if(overlap?.length)return NextResponse.json({error:'Datumen är inte längre tillgängliga.'},{status:409});

    const status=requestType==='reserve-question'?'reserved':'requested';
    const startAt=`${from}T${startTime}:00+02:00`;
    const policy=product.cancellationPolicy||'moderate';
    const acceptedAt=new Date().toISOString();
    const {data:booking,error}=await admin.from('bookings').insert({
      renter_id:user.id,
      owner_id:owner.id,
      product_id:product.id,
      start_date:from,
      end_date:to,
      rental_start_at:startAt,
      cancellation_policy:policy,
      status,
      request_type:requestType,
      message:message.trim().slice(0,2000)||null,
      rental_price:pricing.rentalCost,
      service_fee:pricing.bookingFee,
      terms_version:RENTAL_TERMS_VERSION,
      terms_accepted_at:acceptedAt,
      terms_locale:normalizeTermsLocale(locale),
    }).select('id,status,total_price').single();
    if(error)throw error;

    try{
      await recordBookingEvent({
        bookingId:booking.id,
        actorId:user.id,
        eventType:'booking_created',
        metadata:{status,request_type:requestType,terms_version:RENTAL_TERMS_VERSION,cancellation_policy:policy},
      });
    }catch(eventError){console.error('Could not record booking creation event',eventError);}

    if(message.trim())await admin.from('booking_messages').insert({booking_id:booking.id,sender_id:user.id,body:message.trim().slice(0,2000)});
    await sendPushToUser(owner.id,{
      title:requestType==='reserve-question'?'Ny reservation':'Ny bokningsförfrågan',
      body:`${[product.brand,product.name].filter(Boolean).join(' ')}\n${range(from,to)}`,
      url:`/topsecret/sv/bokningar/${booking.id}`,
      tag:`booking-request-${booking.id}`,
    });

    return NextResponse.json({ok:true,bookingId:booking.id,status:booking.status,total:booking.total_price,reserved:requestType==='reserve-question',cancellationPolicy:policy,termsVersion:RENTAL_TERMS_VERSION});
  }catch(error){
    console.error('Booking request failed',error);
    return NextResponse.json({error:'Kunde inte skicka förfrågan.'},{status:500});
  }
}
