import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getProducts } from '@/lib/sanity-products';
import { sendPushToUser } from '@/lib/push';
import { calculateCancellationRefund } from '@/lib/cancellation-policy';
import { recordBookingEvent } from '@/lib/booking-events';
import { recordSimulatedRefund } from '@/lib/payment-ledger';
import { canBookingTransition } from '@/lib/booking-state';
import type { CancellationPolicy } from '@/lib/products';

const RENTER_REASONS = new Set(['Planerna ändrades','Behöver inte produkten längre','Problem med tid eller plats','Hittade ett annat alternativ','Annat']);
const OWNER_REASONS = new Set(['Produkten är inte tillgänglig','Problem med utlämningen','Produkten behöver repareras','Kan inte genomföra uthyrningen','Annat']);

function range(from:string,to:string){
  const format=(value:string)=>new Intl.DateTimeFormat('sv-SE',{day:'numeric',month:'short',timeZone:'UTC'}).format(new Date(`${value}T12:00:00Z`));
  return `${format(from)} – ${format(to)}`;
}

export async function GET(_request:Request,{params}:{params:Promise<{id:string}>}){
  const {id}=await params;
  const supabase=await createClient();
  const {data:{user}}=await supabase.auth.getUser();
  if(!user)return NextResponse.json({error:'UNAUTHENTICATED'},{status:401});
  const {data:booking}=await supabase.from('bookings').select('*').eq('id',id).maybeSingle();
  if(!booking||![booking.owner_id,booking.renter_id].includes(user.id))return NextResponse.json({error:'NOT_FOUND'},{status:404});
  const isOwner=booking.owner_id===user.id;
  const startAt=booking.rental_start_at||`${booking.start_date}T12:00:00+02:00`;
  const refund=calculateCancellationRefund({
    policy:(booking.cancellation_policy||'moderate') as CancellationPolicy,
    startAt,
    cancelledBy:isOwner?'owner':'renter',
    rentalPrice:Number(booking.rental_price||0),
    serviceFee:Number(booking.service_fee||0),
  });
  return NextResponse.json({policy:booking.cancellation_policy||'moderate',startAt,refund,isOwner,status:booking.status});
}

export async function POST(req:Request,{params}:{params:Promise<{id:string}>}){
  const {id}=await params;
  const supabase=await createClient();
  const admin=createAdminClient();
  const {data:{user}}=await supabase.auth.getUser();
  if(!user)return NextResponse.json({error:'UNAUTHENTICATED'},{status:401});

  const {data:booking}=await supabase.from('bookings').select('*').eq('id',id).maybeSingle();
  if(!booking||![booking.owner_id,booking.renter_id].includes(user.id))return NextResponse.json({error:'NOT_FOUND'},{status:404});

  const isOwner=booking.owner_id===user.id;
  const actor=isOwner?'owner':'renter' as const;

  const body=await req.json();
  const reason=String(body.reason||'').trim();
  const details=String(body.details||'').trim();
  const reasons=isOwner?OWNER_REASONS:RENTER_REASONS;
  if(!reasons.has(reason))return NextResponse.json({error:'INVALID_REASON'},{status:400});
  if(reason==='Annat'&&details.length<10)return NextResponse.json({error:'DETAILS_REQUIRED'},{status:400});

  const policy=(booking.cancellation_policy||'moderate') as CancellationPolicy;
  const startAt=booking.rental_start_at||`${booking.start_date}T12:00:00+02:00`;
  const refund=calculateCancellationRefund({
    policy,
    startAt,
    cancelledBy:isOwner?'owner':'renter',
    rentalPrice:Number(booking.rental_price||0),
    serviceFee:Number(booking.service_fee||0),
  });
  const paid=booking.status==='paid';
  const nextStatus=paid&&refund.totalRefund>0?'refunded':'cancelled';
  if(!canBookingTransition(booking.status,nextStatus,actor))return NextResponse.json({error:'CANCELLATION_NOT_ALLOWED'},{status:409});
  const now=new Date().toISOString();

  // The route has already authenticated the party and validated the exact transition.
  // Use the server-side admin client for the write so renter cancellations are not
  // accidentally blocked by the intentionally owner-only generic UPDATE RLS policy.
  const {data:updated,error}=await admin.from('bookings').update({
    status:nextStatus,
    refund_amount:paid?refund.totalRefund:0,
    refund_rental_amount:paid?refund.rentalRefund:0,
    refund_service_fee:paid?refund.serviceFeeRefund:0,
    cancelled_at:now,
    cancelled_by:isOwner?'owner':'renter',
    updated_at:now,
  }).eq('id',id).eq('status',booking.status).select('id,status').single();
  if(error)throw error;

  const payment=paid&&refund.totalRefund>0
    ? await recordSimulatedRefund(id,refund.totalRefund)
    : null;

  await recordBookingEvent({
    bookingId:id,
    actorId:user.id,
    eventType:'booking_cancelled',
    metadata:{
      cancelled_by:actor,
      reason,
      details:details||null,
      previous_status:booking.status,
      new_status:nextStatus,
      cancellation_policy:policy,
      hours_before_start:refund.hoursBeforeStart,
      refund_percent_rental:refund.percent,
      refund_rental_amount:paid?refund.rentalRefund:0,
      refund_service_fee:paid?refund.serviceFeeRefund:0,
      refund_amount:paid?refund.totalRefund:0,
      payment_id:payment?.id||null,
      refund_mode:paid?(payment?.provider==='simulation'?'ledger_simulation':'provider_pending'):'none',
    },
  });

  const recipient=isOwner?booking.renter_id:booking.owner_id;
  const products=await getProducts();
  const product=products.find(item=>item.id===booking.product_id);
  const name=product?[product.brand,product.name].filter(Boolean).join(' '):'Bokningen';
  if(recipient)await sendPushToUser(recipient,{
    title:'Bokning avbokad',
    body:`${name}\n${range(booking.start_date,booking.end_date)}\nAnledning: ${reason}`,
    url:`/topsecret/sv/bokningar/${id}`,
    tag:`booking-cancelled-${id}`,
  });

  return NextResponse.json({
    ok:true,
    status:updated.status,
    refundAmount:paid?refund.totalRefund:0,
    refundRentalAmount:paid?refund.rentalRefund:0,
    refundServiceFee:paid?refund.serviceFeeRefund:0,
    refundPercent:refund.percent,
    policy,
    paymentId:payment?.id||null,
    refundSimulated:Boolean(payment?.provider==='simulation'),
  });
}
