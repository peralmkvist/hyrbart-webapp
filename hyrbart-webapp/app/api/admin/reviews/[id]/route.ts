import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin';
import { createAdminClient } from '@/lib/supabase/admin';
import { recordAdminAction } from '@/lib/admin-audit';

export async function PATCH(request:Request,{params}:{params:Promise<{id:string}>}){
  const adminUser=await requireAdmin();
  if(!adminUser)return NextResponse.json({error:'FORBIDDEN'},{status:403});
  const {id}=await params;
  const body=await request.json().catch(()=>({}));
  const status=body.status==='hidden'?'hidden':body.status==='visible'?'visible':null;
  const reason=String(body.reason||'').trim();
  const reportResolution=body.reportResolution==='dismissed'?'dismissed':null;
  if(!status)return NextResponse.json({error:'INVALID_STATUS'},{status:400});
  if(status==='hidden'&&reason.length<5)return NextResponse.json({error:'REASON_REQUIRED'},{status:400});
  const admin=createAdminClient();
  const {data:existing,error:loadError}=await admin.from('booking_reviews').select('id,booking_id,reviewer_id,reviewee_id,moderation_status').eq('id',id).maybeSingle();
  if(loadError)return NextResponse.json({error:'LOAD_FAILED'},{status:500});
  if(!existing)return NextResponse.json({error:'NOT_FOUND'},{status:404});

  const {data:result,error}=await admin.rpc('moderate_review_reports_atomic',{
    p_review_id:id,
    p_status:status,
    p_reason:status==='hidden'?reason:null,
    p_report_resolution:reportResolution,
    p_admin_user_id:adminUser.id,
  });
  if(error)return NextResponse.json({error:'SAVE_FAILED'},{status:500});
  const resolvedReports=Array.isArray(result)?Number(result[0]?.resolved_reports||0):0;
  await recordAdminAction({adminUserId:adminUser.id,action:'review_moderation_changed',entityType:'review',entityId:id,metadata:{booking_id:existing.booking_id,previous_status:existing.moderation_status||'visible',new_status:status,reason:status==='hidden'?reason:null,report_resolution:status==='hidden'?'resolved':reportResolution,resolved_reports:resolvedReports}});
  return NextResponse.json({ok:true,status,resolvedReports});
}
