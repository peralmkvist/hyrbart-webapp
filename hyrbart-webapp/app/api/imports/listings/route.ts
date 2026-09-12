import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

type SourcePlatform='hygglo'|'other';

function parseSourceUrl(value:unknown,source:SourcePlatform){
  try{
    const url=new URL(String(value||'').trim());
    if(url.protocol!=='https:')return null;
    const hostname=url.hostname.toLowerCase();
    if(source==='hygglo'&&!(['hygglo.se','www.hygglo.se'].includes(hostname)||hostname.endsWith('.hygglo.se')))return null;
    return url.toString();
  }catch{return null;}
}

export async function GET(){
  const supabase=await createClient();
  const {data:{user}}=await supabase.auth.getUser();
  if(!user)return NextResponse.json({error:'UNAUTHENTICATED'},{status:401});
  const {data,error}=await supabase.from('listing_import_jobs')
    .select('id,source_platform,source_url,status,extracted_data,target_sanity_id,error_message,created_at,updated_at')
    .eq('user_id',user.id)
    .order('created_at',{ascending:false});
  if(error)return NextResponse.json({error:'LOAD_FAILED'},{status:500});
  return NextResponse.json({jobs:data||[]});
}

export async function POST(request:Request){
  const supabase=await createClient();
  const {data:{user}}=await supabase.auth.getUser();
  if(!user)return NextResponse.json({error:'UNAUTHENTICATED'},{status:401});
  let body:any;
  try{body=await request.json();}catch{return NextResponse.json({error:'INVALID_REQUEST'},{status:400});}

  const sourcePlatform:SourcePlatform=body.sourcePlatform==='other'?'other':'hygglo';
  const sourceUrl=parseSourceUrl(body.sourceUrl,sourcePlatform);
  if(!sourceUrl)return NextResponse.json({error:'INVALID_SOURCE_URL'},{status:400});
  if(body.ownershipConfirmed!==true)return NextResponse.json({error:'OWNERSHIP_CONFIRMATION_REQUIRED'},{status:400});

  const {data,error}=await supabase.from('listing_import_jobs').insert({
    user_id:user.id,
    source_platform:sourcePlatform,
    source_url:sourceUrl,
    ownership_confirmed:true,
    status:'pending',
    extracted_data:{},
  }).select('id,source_platform,source_url,status,created_at').single();
  if(error?.code==='23505')return NextResponse.json({error:'ALREADY_SUBMITTED'},{status:409});
  if(error)return NextResponse.json({error:'SAVE_FAILED'},{status:500});
  return NextResponse.json({job:data},{status:201});
}
