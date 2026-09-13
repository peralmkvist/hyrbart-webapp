import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { canBookingTransition } from '@/lib/booking-state';
import { recordBookingEvent } from '@/lib/booking-events';
import { notifyUser } from '@/lib/notifications';

const TYPES=['problem','damage','dispute'] as const;
type CaseType=(typeof TYPES)[number];
const ALLOWED_STATUSES:Record<CaseType,readonly string[]>={
  problem:['accepted','paid','active','returned','completed'],
  damage:['active','returned','completed'],
  dispute:['paid','active','returned','completed'],
};
const OPEN_CASE_STATUSES=['open','awaiting_other_party','under_review'];

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

  const {data:existing,error:existingError}=await admin.from('booking_cases')
    .select('id,status')
    .eq('booking_id',id)
    .eq('case_type',caseType)
    .in('status',OPEN_CASE_STATUSES)
    .limit(1)
    .maybeSingle();
  if(existingError)throw existingError;
  if(existing)return NextResponse.json({error:'CASE_ALREADY_OPEN',caseId:existing.id},{status:409});

  const claimed=body.amount_claimed===null||body.amount_claimed===undefined||body.amount_claimed===''?null:Number(String(body.amount_claimed).replace(',','.'));
  if(claimed!==null&&(!Number.isFinite(claimed)||claimed<0))return NextResponse.json({error:'INVALID_AMOUNT'},{status:400});

  const {data:c,error}=await admin.from('booking_cases').insert({
    booking_id:id,
    opened_by:user.id,
    case_type:caseType,
    reason:String(body.reason).trim().slice(0,120),
    description:description||null,
    amount_claimed:claimed,
    status:caseType==='dispute'?'under_review':'open',
  }).select('*').single();
  if(error)throw error;

  await recordBookingEvent({bookingId:id,actorId:user.id,eventType:`case_${caseType}_opened`,metadata:{case_id:c.id,reason:c.reason,previous_status:b.status}});

  if(!['completed','cancelled','refunded'].includes(b.status)&&canBookingTransition(b.status,'disputed',b.owner_id===user.id?'owner':'renter')){
    const now=new Date().toISOString();
    const {error:transitionError}=await admin.from('bookings').update({status:'disputed',updated_at:now}).eq('id',id).eq('status',b.status);
    if(transitionError)throw transitionError;
    await recordBookingEvent({bookingId:id,actorId:user.id,eventType:'booking_status_changed',metadata:{previous_status:b.status,new_status:'disputed',actor_role:b.owner_id===user.id?'owner':'renter',reason:`case_${caseType}_opened`}});
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

  return NextResponse.json({ok:true,case:c});
}
