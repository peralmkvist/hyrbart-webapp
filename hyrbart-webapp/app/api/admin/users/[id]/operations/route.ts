import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin';
import { recordAdminAction } from '@/lib/admin-audit';
import { createAdminClient } from '@/lib/supabase/admin';
import { notifyUser } from '@/lib/notifications';

const ACCOUNT_STATUSES = new Set(['active','restricted','frozen']);
const FLAG_SEVERITIES = new Set(['low','medium','high','critical']);

export async function POST(request:Request,{params}:{params:Promise<{id:string}>}){
  const adminUser=await requireAdmin();
  if(!adminUser)return NextResponse.json({error:'FORBIDDEN'},{status:403});
  const {id}=await params;
  const body=await request.json().catch(()=>({}));
  const action=String(body.action||'');
  const admin=createAdminClient();

  const {data:profile}=await admin.from('profiles').select('id,account_status').eq('id',id).maybeSingle();
  if(!profile)return NextResponse.json({error:'USER_NOT_FOUND'},{status:404});

  if(action==='account_status'){
    const status=String(body.status||'');
    const reason=String(body.reason||'').trim().slice(0,1000);
    if(!ACCOUNT_STATUSES.has(status))return NextResponse.json({error:'INVALID_STATUS'},{status:400});
    if(status!=='active'&&reason.length<5)return NextResponse.json({error:'REASON_REQUIRED'},{status:400});
    const previous=profile.account_status||'active';
    const {error}=await admin.from('profiles').update({account_status:status,account_status_reason:status==='active'?null:reason,account_status_changed_at:new Date().toISOString(),updated_at:new Date().toISOString()}).eq('id',id);
    if(error)throw error;
    await recordAdminAction({adminUserId:adminUser.id,action:'account_status_changed',entityType:'user',entityId:id,metadata:{previous_status:previous,new_status:status,reason:reason||null}});
    await notifyUser({userId:id,type:'account_status_changed',title:status==='active'?'Ditt konto är aktivt igen':status==='frozen'?'Ditt konto har frysts':'Ditt konto har begränsats',body:status==='active'?'Du kan åter använda Hyrbarts marknadsplatsfunktioner.':`Hyrbart har begränsat vissa nya aktiviteter på kontot. ${reason}`,url:'/topsecret/sv/profil/konto',eventKey:`account-status:${id}:${status}:${Date.now()}`});
    return NextResponse.json({ok:true});
  }

  if(action==='support_note'){
    const note=String(body.note||'').trim().slice(0,4000);
    if(!note)return NextResponse.json({error:'NOTE_REQUIRED'},{status:400});
    const {data,error}=await admin.from('admin_support_notes').insert({user_id:id,admin_user_id:adminUser.id,note}).select('*').single();
    if(error)throw error;
    await recordAdminAction({adminUserId:adminUser.id,action:'support_note_added',entityType:'user',entityId:id,metadata:{note_id:data.id}});
    return NextResponse.json({ok:true,note:data});
  }

  if(action==='risk_flag'){
    const severity=String(body.severity||'medium');
    const reason=String(body.reason||'').trim().slice(0,1000);
    const bookingId=body.bookingId?String(body.bookingId):null;
    if(!FLAG_SEVERITIES.has(severity)||reason.length<3)return NextResponse.json({error:'INVALID_FLAG'},{status:400});
    const {data,error}=await admin.from('risk_flags').insert({user_id:id,booking_id:bookingId,severity,reason,created_by:adminUser.id}).select('*').single();
    if(error)throw error;
    await recordAdminAction({adminUserId:adminUser.id,action:'risk_flag_created',entityType:'user',entityId:id,metadata:{flag_id:data.id,severity,reason,booking_id:bookingId}});
    return NextResponse.json({ok:true,flag:data});
  }

  if(action==='listing_moderation'){
    const productId=String(body.productId||'').trim();
    const status=String(body.status||'');
    const reason=String(body.reason||'').trim().slice(0,1000);
    if(!productId||!['active','hidden'].includes(status))return NextResponse.json({error:'INVALID_LISTING_ACTION'},{status:400});
    if(status==='hidden'&&reason.length<5)return NextResponse.json({error:'REASON_REQUIRED'},{status:400});
    const {data,error}=await admin.from('listing_moderation').upsert({product_id:productId,status,reason:status==='active'?null:reason,changed_by:adminUser.id,changed_at:new Date().toISOString()},{onConflict:'product_id'}).select('*').single();
    if(error)throw error;
    await recordAdminAction({adminUserId:adminUser.id,action:'listing_moderation_changed',entityType:'product',entityId:productId,metadata:{status,reason:reason||null,user_id:id}});
    return NextResponse.json({ok:true,moderation:data});
  }

  return NextResponse.json({error:'UNKNOWN_ACTION'},{status:400});
}
