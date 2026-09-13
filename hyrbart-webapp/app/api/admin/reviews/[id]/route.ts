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
  if(!status)return NextResponse.json({error:'INVALID_STATUS'},{status:400});
  if(status==='hidden'&&reason.length<5)return NextResponse.json({error:'REASON_REQUIRED'},{status:400});
  const admin=createAdminClient();
  const {data:existing,error:loadError}=await admin.from('booking_reviews').select('id,booking_id,reviewer_id,reviewee_id,moderation_status').eq('id',id).maybeSingle();
  if(loadError)return NextResponse.json({error:'LOAD_FAILED'},{status:500});
  if(!existing)return NextResponse.json({error:'NOT_FOUND'},{status:404});
  const now=new Date().toISOString();
  const patch=status==='hidden'?{moderation_status:'hidden',moderation_reason:reason,moderated_at:now,moderated_by:adminUser.id}:{moderation_status:'visible',moderation_reason:null,moderated_at:now,moderated_by:adminUser.id};
  const {error}=await admin.from('booking_reviews').update(patch).eq('id',id);
  if(error)return NextResponse.json({error:'SAVE_FAILED'},{status:500});
  await recordAdminAction({adminUserId:adminUser.id,action:'review_moderation_changed',entityType:'review',entityId:id,metadata:{booking_id:existing.booking_id,previous_status:existing.moderation_status||'visible',new_status:status,reason:status==='hidden'?reason:null}});
  return NextResponse.json({ok:true,status});
}
