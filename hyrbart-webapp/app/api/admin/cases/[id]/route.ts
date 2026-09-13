import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireAdmin } from '@/lib/admin';
import { recordAdminAction } from '@/lib/admin-audit';
import { settleBookingDispute, type ResolutionType } from '@/lib/dispute-settlement';
import { notifyBookingParties } from '@/lib/notifications';

const STATUSES=new Set(['open','under_review','resolved','rejected']);
const RESOLUTIONS=new Set<ResolutionType>(['full_refund','full_payout','split','no_financial_action']);
const EVIDENCE_BUCKET='booking-case-evidence';
const CONDITION_BUCKET='booking-condition-photos';

export async function GET(_request:Request,{params}:{params:Promise<{id:string}>}){
  const user=await requireAdmin();
  if(!user)return NextResponse.json({error:'FORBIDDEN'},{status:403});
  const {id}=await params;
  const admin=createAdminClient();
  const {data:caseRow}=await admin.from('booking_cases').select('*').eq('id',id).maybeSingle();
  if(!caseRow)return NextResponse.json({error:'NOT_FOUND'},{status:404});
  const {data:booking}=await admin.from('bookings').select('*').eq('id',caseRow.booking_id).maybeSingle();
  const [{data:events},{data:evidence},{data:photos},{data:notes}]=await Promise.all([
    admin.from('booking_events').select('*').eq('booking_id',caseRow.booking_id).order('created_at'),
    admin.from('booking_case_evidence').select('*').eq('case_id',id).order('created_at'),
    admin.from('booking_condition_photos').select('*').eq('booking_id',caseRow.booking_id).order('created_at'),
    admin.from('admin_support_notes').select('*').eq('case_id',id).order('created_at'),
  ]);
  const ids=booking?[booking.owner_id,booking.renter_id]:[];
  const {data:profiles,error:profilesError}=ids.length
    ? await admin.from('profiles').select('id,display_name,city').in('id',ids)
    : {data:[] as any[],error:null};
  if(profilesError)return NextResponse.json({error:'PROFILE_LOAD_FAILED'},{status:500});
  const names=new Map((profiles||[]).map((profile:any)=>[profile.id,profile.display_name||'Användare']));
  const signedEvidence=await Promise.all((evidence||[]).map(async(item:any)=>{
    const {data}=await admin.storage.from(EVIDENCE_BUCKET).createSignedUrl(item.storage_path,3600);
    return {...item,url:data?.signedUrl||null,uploader_name:names.get(item.uploaded_by)||'Användare'};
  }));
  const signedPhotos=await Promise.all((photos||[]).map(async(item:any)=>{
    const {data}=await admin.storage.from(CONDITION_BUCKET).createSignedUrl(item.storage_path,3600);
    return {...item,url:data?.signedUrl||null};
  }));
  return NextResponse.json({case:caseRow,booking,events:events||[],evidence:signedEvidence,conditionPhotos:signedPhotos,profiles:profiles||[],adminNotes:notes||[]});
}

export async function PATCH(req:Request,{params}:{params:Promise<{id:string}>}){
  const user=await requireAdmin();
  if(!user)return NextResponse.json({error:'FORBIDDEN'},{status:403});
  const {id}=await params;
  const body=await req.json().catch(()=>({}));
  const admin=createAdminClient();
  const status=String(body.status||'');
  if(!STATUSES.has(status))return NextResponse.json({error:'INVALID_STATUS'},{status:400});
  const note=String(body.note||'').trim().slice(0,4000);
  const decision=String(body.decision||'').trim().slice(0,4000);
  const resolutionType=String(body.resolutionType||'') as ResolutionType;
  const refundAmount=body.refundAmount===null||body.refundAmount===''?0:Number(body.refundAmount);
  const payoutAmount=body.payoutAmount===null||body.payoutAmount===''?0:Number(body.payoutAmount);
  const {data:caseRow}=await admin.from('booking_cases').select('*').eq('id',id).maybeSingle();
  if(!caseRow)return NextResponse.json({error:'NOT_FOUND'},{status:404});
  const closing=['resolved','rejected'].includes(status);
  if(closing&&decision.length<10)return NextResponse.json({error:'DECISION_REQUIRED'},{status:400});
  if(closing&&!RESOLUTIONS.has(resolutionType))return NextResponse.json({error:'RESOLUTION_REQUIRED'},{status:400});
  if(caseRow.resolved_at&&closing)return NextResponse.json({error:'ALREADY_RESOLVED'},{status:409});

  if(note){
    const {error:noteError}=await admin.from('admin_support_notes').insert({case_id:id,booking_id:caseRow.booking_id,admin_user_id:user.id,note});
    if(noteError)throw noteError;
  }

  let settlement:any=null;
  if(closing){
    try{
      settlement=await settleBookingDispute({bookingId:caseRow.booking_id,adminUserId:user.id,resolutionType,refundAmount,payoutAmount});
    }catch(error:any){
      const code=String(error?.message||'SETTLEMENT_FAILED');
      if(['REFUND_EXCEEDS_TOTAL','PAYOUT_EXCEEDS_RENTAL','SETTLEMENT_EXCEEDS_TOTAL'].includes(code))return NextResponse.json({error:code},{status:400});
      throw error;
    }
  }

  const now=new Date().toISOString();
  const update:any={status,updated_at:now};
  if(closing){
    update.resolution=decision;
    update.resolution_note=decision;
    update.resolution_type=resolutionType;
    update.refund_amount=settlement?.refundAmount||0;
    update.payout_amount=settlement?.payoutAmount||0;
    update.resolved_at=now;
    update.resolved_by=user.id;
  }
  const {data:updated,error}=await admin.from('booking_cases').update(update).eq('id',id).select('*').single();
  if(error)return NextResponse.json({error:'SAVE_FAILED'},{status:500});

  await admin.from('booking_events').insert({
    booking_id:caseRow.booking_id,
    actor_id:user.id,
    event_type:'case_admin_updated',
    metadata:{case_id:id,status,decision:decision||null,resolution_type:closing?resolutionType:null,refund_amount:settlement?.refundAmount||0,payout_amount:settlement?.payoutAmount||0},
  });
  await recordAdminAction({
    adminUserId:user.id,
    action:closing?'booking_case_resolved':'booking_case_updated',
    entityType:'booking_case',
    entityId:id,
    metadata:{booking_id:caseRow.booking_id,previous_status:caseRow.status,new_status:status,resolution_type:closing?resolutionType:null,refund_amount:settlement?.refundAmount||0,payout_amount:settlement?.payoutAmount||0,note_added:Boolean(note)},
  });

  if(closing&&settlement?.booking){
    const title=status==='rejected'?'Ärendet är avslutat':'Beslut i ditt Hyrbart-ärende';
    const financial=resolutionType==='full_refund'?`Full återbetalning: ${settlement.refundAmount} kr.`:resolutionType==='full_payout'?`Utbetalning till uthyraren: ${settlement.payoutAmount} kr.`:resolutionType==='split'?`Återbetalning ${settlement.refundAmount} kr, utbetalning ${settlement.payoutAmount} kr.`:'Ingen automatisk ekonomisk åtgärd.';
    await notifyBookingParties({renterId:settlement.booking.renter_id,ownerId:settlement.booking.owner_id,bookingId:caseRow.booking_id,type:'case_resolved',title,body:`${decision}\n${financial}`,url:`/topsecret/sv/bokningar/${caseRow.booking_id}`,eventKey:`case:${id}:resolved`});
  }

  return NextResponse.json({ok:true,case:updated,settlement});
}
