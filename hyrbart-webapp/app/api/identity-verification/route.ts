import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { correlationIdFromRequest, errorSummary, logOperationalEvent } from '@/lib/observability';
import { getIdentityVerificationState, startIdentityVerification } from '@/lib/identity-verification';

export const dynamic='force-dynamic';

async function currentUser(){
  const supabase=await createClient();
  const {data:{user}}=await supabase.auth.getUser();
  return user;
}

export async function GET(){
  const user=await currentUser();
  if(!user)return NextResponse.json({error:'UNAUTHENTICATED'},{status:401,headers:{'Cache-Control':'private, no-store'}});
  try{
    const state=await getIdentityVerificationState(user.id);
    return NextResponse.json(state,{headers:{'Cache-Control':'private, no-store'}});
  }catch(error){
    console.error('Identity verification status failed',error);
    return NextResponse.json({error:'IDENTITY_STATUS_FAILED'},{status:500,headers:{'Cache-Control':'private, no-store'}});
  }
}

export async function POST(request:Request){
  const user=await currentUser();
  if(!user)return NextResponse.json({error:'UNAUTHENTICATED'},{status:401,headers:{'Cache-Control':'private, no-store'}});
  const correlationId=correlationIdFromRequest(request);
  try{
    const body=await request.json().catch(()=>({})) as {locale?:unknown};
    const locale=body.locale==='en'?'en':'sv';
    const result=await startIdentityVerification(user.id,correlationId);
    if(!result.available){
      return NextResponse.json({error:result.reason,providerConfigured:false},{status:503,headers:{'Cache-Control':'private, no-store','X-Request-ID':correlationId}});
    }
    await logOperationalEvent({correlationId,severity:'info',eventType:'identity_verification_started',source:'identity-verification',route:'/api/identity-verification',entityType:'user',entityId:user.id,message:'Identity verification attempt started',metadata:{provider:result.provider,reused:result.reused},persist:false});
    const redirectUrl=result.provider==='idura-bankid'
      ? `/api/idura/start?attemptId=${encodeURIComponent(result.attemptId)}&locale=${locale}`
      : null;
    return NextResponse.json({...result,redirectUrl},{status:202,headers:{'Cache-Control':'private, no-store','X-Request-ID':correlationId}});
  }catch(error){
    await logOperationalEvent({correlationId,severity:'error',eventType:'identity_verification_start_failed',source:'identity-verification',route:'/api/identity-verification',entityType:'user',entityId:user.id,message:'Identity verification attempt could not start',metadata:{error:errorSummary(error)}});
    return NextResponse.json({error:'IDENTITY_START_FAILED'},{status:500,headers:{'Cache-Control':'private, no-store','X-Request-ID':correlationId}});
  }
}
