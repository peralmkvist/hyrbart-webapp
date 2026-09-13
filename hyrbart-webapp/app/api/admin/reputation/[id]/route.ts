import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin';
import { createAdminClient } from '@/lib/supabase/admin';
import { recordAdminAction } from '@/lib/admin-audit';

export async function POST(request:Request,{params}:{params:Promise<{id:string}>}){
  const {id}=await params;
  const adminUser=await requireAdmin();
  if(!adminUser)return NextResponse.json({error:'FORBIDDEN'},{status:403});

  let body:any;
  try{body=await request.json();}catch{return NextResponse.json({error:'INVALID_REQUEST'},{status:400});}
  const status=body.status;
  if(!['verified','rejected'].includes(status))return NextResponse.json({error:'INVALID_STATUS'},{status:400});

  const verifiedRating=body.verifiedRating==null||body.verifiedRating===''?null:Number(String(body.verifiedRating).replace(',','.'));
  const verifiedReviewCount=body.verifiedReviewCount==null||body.verifiedReviewCount===''?null:Number(body.verifiedReviewCount);
  if(status==='verified'){
    if(verifiedRating!=null&&(!Number.isFinite(verifiedRating)||verifiedRating<1||verifiedRating>5))return NextResponse.json({error:'INVALID_RATING'},{status:400});
    if(verifiedReviewCount!=null&&(!Number.isInteger(verifiedReviewCount)||verifiedReviewCount<0))return NextResponse.json({error:'INVALID_REVIEW_COUNT'},{status:400});
    if(verifiedRating==null&&verifiedReviewCount==null)return NextResponse.json({error:'VERIFIED_DATA_REQUIRED'},{status:400});
  }

  const admin=createAdminClient();
  const {data:existing,error:loadError}=await admin.from('external_reputation_claims').select('*').eq('id',id).maybeSingle();
  if(loadError)return NextResponse.json({error:'LOAD_FAILED'},{status:500});
  if(!existing)return NextResponse.json({error:'NOT_FOUND'},{status:404});

  const now=new Date().toISOString();
  const update=status==='verified'?{
    status:'verified',
    verification_method:'manual_public_profile',
    verified_rating:verifiedRating,
    verified_review_count:verifiedReviewCount,
    verified_at:now,
    verified_by:adminUser.id,
    admin_note:String(body.adminNote||'').trim().slice(0,2000)||null,
    updated_at:now,
  }:{
    status:'rejected',
    verification_method:'manual_public_profile',
    verified_rating:null,
    verified_review_count:null,
    verified_at:now,
    verified_by:adminUser.id,
    admin_note:String(body.adminNote||'').trim().slice(0,2000)||null,
    updated_at:now,
  };

  const {data,error}=await admin.from('external_reputation_claims').update(update).eq('id',id).select('*').single();
  if(error)return NextResponse.json({error:'SAVE_FAILED'},{status:500});

  await recordAdminAction({
    adminUserId:adminUser.id,
    action:status==='verified'?'external_reputation_verified':'external_reputation_rejected',
    entityType:'external_reputation_claim',
    entityId:id,
    metadata:{user_id:existing.user_id,source_platform:existing.source_platform,source_profile_url:existing.source_profile_url,verified_rating:verifiedRating,verified_review_count:verifiedReviewCount},
  });

  return NextResponse.json({claim:data});
}
