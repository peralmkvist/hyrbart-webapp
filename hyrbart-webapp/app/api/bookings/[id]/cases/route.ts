import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { recordBookingEvent } from '@/lib/booking-events';
import { notifyUser } from '@/lib/notifications';

const TYPES=['problem','damage','dispute'] as const;
type CaseType=(typeof TYPES)[number];
type BookingCaseResult={id:string;reason:string;[key:string]:unknown};
const ALLOWED_STATUSES:Record<CaseType,readonly string[]>={
  problem:['accepted','paid','active','returned','completed'],
  damage:['active','returned','completed'],
  dispute:['paid','active','returned','completed'],
};

export async function GET(_:Request,{params}:{params:Promise<{id:string}>}){
  const {id}=await params;
  const s=await createClient();
  const {data:{user}}=await s.auth.getUser();
  if(!user)return NextResponse.json({error:'UNAUTHENTICATED'},{status:401});
  const {data:b}=await s.from('bookings').select('owner_id,renter_id').eq('id',id).maybeSingle();
  if(!b||![b.owner_id,b.renter_id].includes(user.id))return NextResponse.json({error:'NOT_FOUND'},{status:404});
  const {data:cases}=await s.from('booking_cases').select('*').eq('booking_id',id).order('created_at',{ascending:false});
  const {data:events}=await s.from('booking_events').select('*').eq('booking_id',id).order('created_at',{ascending:false});
  return NextResponse.json({cases:cases||[],events:events||[]});
}

export async function POST(req:Request,{params}:{params:Promise<{id:string}>}){
  const {id}=await params;
  const s=await createClient();
  const admin=createAdminClient();
  const {data:{user}}=await s.auth.getUser();
  if(!user)return NextResponse.json({error:'UNAUTHENTICATED'},{status:401});

  const {data:b,error:bookingError}=await admin.from('bookings').select('id,owner_id,renter_id,status').eq('id',id).maybeSingle();
  if(bookingError)throw bookingError;
  if(!b||![b.owner_id,b.renter_id].includes(user.id))return NextResponse.json({error:'NOT_FOUND'},{status:404});

  let body:any;
  try{body=await req.json();}catch{return NextResponse.json({error:'INVALID_CASE'},{status:400});}
  const caseType=body.case_type as CaseType;
  if(!TYPES.includes(caseType)||!String(body.reason||'').trim())return NextResponse.json({error:'INVALID_CASE'},{status:400});
  if(!ALLOWED_STATUSES[caseType].includes(b.status))return NextResponse.json({error:'CASE_NOT_ALLOWED_FOR_STATUS',status:b.status},{status:409});

  const description=String(body.description||'').trim();
  if(['damage','dispute'].includes(caseType)&&description.length<10)return NextResponse.json({error:'DESCRIPTION_REQUIRED'},{status:400});

  const claimedRaw=body.amount_claimed===null||body.amount_claimed===undefined||body.amount_claimed===''?null:Number(String(body.amount_claimed).replace(',','.'));
  if(claimedRaw!==null&&(!Number.isFinite(claimedRaw)||claimedRaw<0))return NextResponse.json({error:'INVALID_AMOUNT'},{status:400});
  const claimed=claimedRaw===null?null:Math.round(claimedRaw);

  const {data,error}=await admin.rpc('open_booking_case_atomic',{
    p_booking_id:id,
    p_opened_by:user.id,
    p_case_type:caseType,
    p_reason:String(body.reason).trim(),
    p_description:description||null,
    p_amount_claimed:claimed,
  }).single();
  if(error){
    const message=String(error.message||'');
    if(message.includes('CASE_ALREADY_OPEN'))return NextResponse.json({error:'CASE_ALREADY_OPEN'},{status:409});
    if(message.includes('CASE_NOT_ALLOWED_FOR_STATUS'))return NextResponse.json({error:'CASE_NOT_ALLOWED_FOR_STATUS'},{status:409});
    if(message.includes('NOT_PARTICIPANT'))return NextResponse.json({error:'NOT_FOUND'},{status:404});
    throw error;
  }
  const c=data as unknown as BookingCaseResult;

  const {data:current,error:currentError}=await admin.from('bookings').select('status').eq('id',id).single();
  if(currentError)throw currentError;
  await recordBookingEvent({bookingId:id,actorId:user.id,eventType:`case_${caseType}_opened`,metadata:{case_id:c.id,reason:c.reason,previous_status:b.status,new_status:current.status}});
  if(b.status!==current.status){
    await recordBookingEvent({bookingId:id,actorId:user.id,eventType:'booking_status_changed',metadata:{previous_status:b.status,new_status:current.status,actor_role:b.owner_id===user.id?'owner':'renter',reason:`case_${caseType}_opened`}});
  }else if(current.status==='completed'){
    const {data:payout}=await admin.from('booking_payouts').select('id,status').eq('booking_id',id).maybeSingle();
    if(payout?.status==='pending')await recordBookingEvent({bookingId:id,actorId:user.id,eventType:'payout_held_for_case',metadata:{case_id:c.id,payout_id:payout.id,reason:`case_${caseType}_opened`}});
  }

  const recipientId=b.owner_id===user.id?b.renter_id:b.owner_id;
  if(recipientId){
    await notifyUser({
      userId:recipientId,
      bookingId:id,
      type:`case_${caseType}_opened`,
      title:caseType==='damage'?'Nytt skadeärende':caseType==='dispute'?'Ny tvist':'Nytt bokningsärende',
      body:String(body.reason).trim().slice(0,120),
      url:`/topsecret/sv/arenden/${c.id}`,
      eventKey:`case-opened:${c.id}:${recipientId}`,
    });
  }

  return NextResponse.json({ok:true,case:c,status:current.status});
}
