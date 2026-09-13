import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireAdmin } from '@/lib/admin';
import { recordAdminAction } from '@/lib/admin-audit';

const STATUSES=new Set(['open','under_review','resolved','rejected']);
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
  const [{data:events},{data:evidence},{data:photos}]=await Promise.all([
    admin.from('booking_events').select('*').eq('booking_id',caseRow.booking_id).order('created_at'),
    admin.from('booking_case_evidence').select('*').eq('case_id',id).order('created_at'),
    admin.from('booking_condition_photos').select('*').eq('booking_id',caseRow.booking_id).order('created_at'),
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
  return NextResponse.json({case:caseRow,booking,events:events||[],evidence:signedEvidence,conditionPhotos:signedPhotos,profiles:profiles||[]});
}

export async function PATCH(req:Request,{params}:{params:Promise<{id:string}>}){
  const user=await requireAdmin();
  if(!user)return NextResponse.json({error:'FORBIDDEN'},{status:403});
  const {id}=await params;
  const body=await req.json();
  const admin=createAdminClient();
  const status=String(body.status||'');
  if(!STATUSES.has(status))return NextResponse.json({error:'INVALID_STATUS'},{status:400});
  const note=String(body.note||'').trim().slice(0,4000);
  const decision=String(body.decision||'').trim().slice(0,4000);
  const amount=body.amount===null||body.amount===''?null:Number(body.amount);
  const {data:caseRow}=await admin.from('booking_cases').select('*').eq('id',id).maybeSingle();
  if(!caseRow)return NextResponse.json({error:'NOT_FOUND'},{status:404});
  if(['resolved','rejected'].includes(status)&&decision.length<10)return NextResponse.json({error:'DECISION_REQUIRED'},{status:400});

  const {data:updated,error}=await admin.from('booking_cases').update({status,updated_at:new Date().toISOString()}).eq('id',id).select('*').single();
  if(error)return NextResponse.json({error:'SAVE_FAILED'},{status:500});

  await admin.from('booking_events').insert({
    booking_id:caseRow.booking_id,
    actor_id:user.id,
    event_type:'case_admin_updated',
    metadata:{case_id:id,status,note:note||null,decision:decision||null,amount:Number.isFinite(amount)?amount:null},
  });
  await recordAdminAction({
    adminUserId:user.id,
    action:'booking_case_updated',
    entityType:'booking_case',
    entityId:id,
    metadata:{booking_id:caseRow.booking_id,previous_status:caseRow.status,new_status:status,note:note||null,decision:decision||null,amount:Number.isFinite(amount)?amount:null},
  });

  if(status==='resolved'){
    const {data:booking}=await admin.from('bookings').select('status').eq('id',caseRow.booking_id).maybeSingle();
    if(booking?.status==='disputed')await admin.from('bookings').update({status:'completed',updated_at:new Date().toISOString()}).eq('id',caseRow.booking_id);
  }
  return NextResponse.json({ok:true,case:updated});
}
