import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin';
import { createAdminClient } from '@/lib/supabase/admin';
import { recordAdminAction } from '@/lib/admin-audit';

const ALLOWED=new Set(['processing','needs_review','ready','imported','rejected','failed','cancelled']);

export async function POST(request:Request,{params}:{params:Promise<{id:string}>}){
  const {id}=await params;
  const adminUser=await requireAdmin();
  if(!adminUser)return NextResponse.json({error:'FORBIDDEN'},{status:403});
  let body:any;
  try{body=await request.json();}catch{return NextResponse.json({error:'INVALID_REQUEST'},{status:400});}
  const status=String(body.status||'');
  if(!ALLOWED.has(status))return NextResponse.json({error:'INVALID_STATUS'},{status:400});

  const admin=createAdminClient();
  const {data:existing,error:loadError}=await admin.from('listing_import_jobs').select('*').eq('id',id).maybeSingle();
  if(loadError)return NextResponse.json({error:'LOAD_FAILED'},{status:500});
  if(!existing)return NextResponse.json({error:'NOT_FOUND'},{status:404});

  const extractedData=body.extractedData&&typeof body.extractedData==='object'&&!Array.isArray(body.extractedData)?body.extractedData:existing.extracted_data||{};
  const serialized=JSON.stringify(extractedData);
  if(serialized.length>100000)return NextResponse.json({error:'EXTRACTED_DATA_TOO_LARGE'},{status:413});
  const targetSanityId=String(body.targetSanityId||existing.target_sanity_id||'').trim()||null;
  const errorMessage=String(body.errorMessage||'').trim().slice(0,2000)||null;
  if(status==='imported'&&!targetSanityId)return NextResponse.json({error:'TARGET_REQUIRED'},{status:400});

  const now=new Date().toISOString();
  const {data,error}=await admin.from('listing_import_jobs').update({
    status,
    extracted_data:extractedData,
    target_sanity_id:targetSanityId,
    error_message:['failed','rejected'].includes(status)?errorMessage:null,
    updated_at:now,
  }).eq('id',id).select('*').single();
  if(error)return NextResponse.json({error:'SAVE_FAILED'},{status:500});

  await recordAdminAction({
    adminUserId:adminUser.id,
    action:'listing_import_status_changed',
    entityType:'listing_import_job',
    entityId:id,
    metadata:{previous_status:existing.status,new_status:status,source_platform:existing.source_platform,source_url:existing.source_url,target_sanity_id:targetSanityId},
  });

  return NextResponse.json({job:data});
}
