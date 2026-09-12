import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

type SourcePlatform='hygglo'|'other';

function parseUrl(value:unknown,source:SourcePlatform){
  try{
    const url=new URL(String(value||'').trim());
    if(url.protocol!=='https:')return null;
    if(source==='hygglo'&&!(['hygglo.se','www.hygglo.se'].includes(url.hostname.toLowerCase())||url.hostname.toLowerCase().endsWith('.hygglo.se')))return null;
    return url.toString();
  }catch{return null;}
}

export async function GET(){
  const supabase=await createClient();
  const {data:{user}}=await supabase.auth.getUser();
  if(!user)return NextResponse.json({error:'UNAUTHENTICATED'},{status:401});
  const {data,error}=await supabase.from('external_reputation_claims')
    .select('id,source_platform,source_profile_url,claimed_rating,claimed_review_count,status,verified_rating,verified_review_count,verified_at,created_at')
    .eq('user_id',user.id).order('created_at',{ascending:false});
  if(error)return NextResponse.json({error:'LOAD_FAILED'},{status:500});
  return NextResponse.json({claims:data||[]});
}

export async function POST(request:Request){
  const supabase=await createClient();
  const {data:{user}}=await supabase.auth.getUser();
  if(!user)return NextResponse.json({error:'UNAUTHENTICATED'},{status:401});

  let body:any;
  try{body=await request.json();}catch{return NextResponse.json({error:'INVALID_REQUEST'},{status:400});}
  const sourcePlatform:SourcePlatform=body.sourcePlatform==='other'?'other':'hygglo';
  const sourceProfileUrl=parseUrl(body.sourceProfileUrl,sourcePlatform);
  if(!sourceProfileUrl)return NextResponse.json({error:'INVALID_PROFILE_URL'},{status:400});

  const rating=body.claimedRating==null||body.claimedRating===''?null:Number(body.claimedRating);
  const reviewCount=body.claimedReviewCount==null||body.claimedReviewCount===''?null:Number(body.claimedReviewCount);
  if(rating!=null&&(!Number.isFinite(rating)||rating<1||rating>5))return NextResponse.json({error:'INVALID_RATING'},{status:400});
  if(reviewCount!=null&&(!Number.isInteger(reviewCount)||reviewCount<0))return NextResponse.json({error:'INVALID_REVIEW_COUNT'},{status:400});

  const {data,error}=await supabase.from('external_reputation_claims').insert({
    user_id:user.id,
    source_platform:sourcePlatform,
    source_profile_url:sourceProfileUrl,
    claimed_rating:rating,
    claimed_review_count:reviewCount,
    status:'pending',
  }).select('id,status,source_platform,source_profile_url,created_at').single();
  if(error?.code==='23505')return NextResponse.json({error:'ALREADY_SUBMITTED'},{status:409});
  if(error)return NextResponse.json({error:'SAVE_FAILED'},{status:500});
  return NextResponse.json({claim:data},{status:201});
}
