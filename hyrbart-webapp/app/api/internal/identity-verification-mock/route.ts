import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { correlationIdFromRequest } from '@/lib/observability';
import { applyTrustedProviderResult, configuredIdentityProvider, type ProviderResultStatus } from '@/lib/identity-verification';

export const dynamic='force-dynamic';
const outcomes=new Set<ProviderResultStatus>(['pending','verified','failed','cancelled','review_required','revoked']);

function mockAllowed(){
  return process.env.VERCEL_ENV!=='production'&&process.env.NODE_ENV!=='production'&&configuredIdentityProvider()==='mock';
}

export async function POST(request:Request){
  if(!mockAllowed())return NextResponse.json({error:'NOT_FOUND'},{status:404});
  const supabase=await createClient();
  const {data:{user}}=await supabase.auth.getUser();
  if(!user)return NextResponse.json({error:'UNAUTHENTICATED'},{status:401});
  const body=await request.json().catch(()=>({})) as {attemptId?:string;status?:ProviderResultStatus;failureCode?:string};
  const attemptId=String(body.attemptId||'');
  const status=body.status;
  if(!attemptId||!status||!outcomes.has(status))return NextResponse.json({error:'INVALID_MOCK_RESULT'},{status:400});
  const correlationId=correlationIdFromRequest(request);
  try{
    const result=await applyTrustedProviderResult({userId:user.id,attemptId,provider:'mock',status,providerEventId:`mock_${crypto.randomUUID()}`,failureCode:body.failureCode||null,correlationId});
    return NextResponse.json({ok:true,...result},{headers:{'Cache-Control':'private, no-store','X-Request-ID':correlationId}});
  }catch(error){
    console.error('Identity mock result failed',error);
    return NextResponse.json({error:'MOCK_RESULT_FAILED'},{status:500});
  }
}
