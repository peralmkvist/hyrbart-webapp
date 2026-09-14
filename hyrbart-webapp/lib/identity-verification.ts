import 'server-only';
import { createAdminClient } from '@/lib/supabase/admin';

export type IdentityVerificationStatus = 'unverified'|'pending'|'verified'|'failed'|'cancelled'|'review_required'|'revoked';
export type ProviderResultStatus = Exclude<IdentityVerificationStatus,'unverified'>;

const isProduction = () => process.env.VERCEL_ENV ? process.env.VERCEL_ENV === 'production' : process.env.NODE_ENV === 'production';

export function configuredIdentityProvider() {
  const provider = String(process.env.IDENTITY_VERIFICATION_PROVIDER || '').trim().toLowerCase();
  if (!provider) return null;
  if (provider === 'mock' && isProduction()) return null;
  return provider;
}

export async function getIdentityVerificationState(userId:string){
  const admin=createAdminClient();
  const [{data:profile,error:profileError},{data:attempt,error:attemptError}]=await Promise.all([
    admin.from('profiles').select('bankid_verified,identity_verification_status,identity_verification_provider,identity_verified_at').eq('id',userId).maybeSingle(),
    admin.from('identity_verification_attempts').select('id,provider,status,failure_code,started_at,completed_at,updated_at').eq('user_id',userId).order('started_at',{ascending:false}).limit(1).maybeSingle(),
  ]);
  if(profileError)throw profileError;
  if(attemptError)throw attemptError;
  const status=(profile?.identity_verification_status||'unverified') as IdentityVerificationStatus;
  return {
    status,
    verified:Boolean(profile?.bankid_verified||status==='verified'),
    provider:profile?.identity_verification_provider||attempt?.provider||null,
    verifiedAt:profile?.identity_verified_at||null,
    latestAttempt:attempt||null,
    configuredProvider:configuredIdentityProvider(),
  };
}

export async function startIdentityVerification(userId:string,correlationId:string){
  const provider=configuredIdentityProvider();
  if(!provider)return {available:false as const,reason:'PROVIDER_NOT_CONFIGURED' as const};
  const admin=createAdminClient();
  const {data:latest}=await admin.from('identity_verification_attempts').select('id,status').eq('user_id',userId).order('started_at',{ascending:false}).limit(1).maybeSingle();
  if(latest?.status==='pending')return {available:true as const,attemptId:latest.id,provider,status:'pending' as const,reused:true};
  const providerAttemptId=provider==='mock'?`mock_${crypto.randomUUID()}`:null;
  const {data:attempt,error}=await admin.from('identity_verification_attempts').insert({user_id:userId,provider,provider_attempt_id:providerAttemptId,status:'pending'}).select('id,status').single();
  if(error)throw error;
  const now=new Date().toISOString();
  const {error:profileError}=await admin.from('profiles').update({identity_verification_status:'pending',identity_verification_provider:provider,identity_verified_at:null,bankid_verified:false,updated_at:now}).eq('id',userId);
  if(profileError)throw profileError;
  const eventType=latest?'retry_requested':'started';
  const {error:eventError}=await admin.from('identity_verification_events').insert({attempt_id:attempt.id,user_id:userId,provider,event_type:eventType,correlation_id:correlationId,metadata:{contract_version:1}});
  if(eventError)throw eventError;
  return {available:true as const,attemptId:attempt.id,provider,status:'pending' as const,reused:false};
}

export async function applyTrustedProviderResult(input:{userId:string;attemptId:string;provider:string;status:ProviderResultStatus;providerEventId?:string|null;failureCode?:string|null;correlationId:string}){
  const provider=input.provider.trim().toLowerCase();
  if(provider==='mock'&&isProduction())throw new Error('MOCK_PROVIDER_FORBIDDEN_IN_PRODUCTION');
  const admin=createAdminClient();
  const {data:attempt,error:attemptError}=await admin.from('identity_verification_attempts').select('id,user_id,provider,status').eq('id',input.attemptId).eq('user_id',input.userId).eq('provider',provider).maybeSingle();
  if(attemptError)throw attemptError;
  if(!attempt)throw new Error('IDENTITY_ATTEMPT_NOT_FOUND');
  const completed=input.status==='pending'?null:new Date().toISOString();
  const {error:updateError}=await admin.from('identity_verification_attempts').update({status:input.status,failure_code:input.failureCode||null,completed_at:completed,updated_at:new Date().toISOString()}).eq('id',attempt.id);
  if(updateError)throw updateError;
  const verified=input.status==='verified';
  const profileStatus=input.status as IdentityVerificationStatus;
  const {error:profileError}=await admin.from('profiles').update({identity_verification_status:profileStatus,identity_verification_provider:provider,identity_verified_at:verified?new Date().toISOString():null,bankid_verified:verified&&provider.includes('bankid'),updated_at:new Date().toISOString()}).eq('id',input.userId);
  if(profileError)throw profileError;
  const {error:eventError}=await admin.from('identity_verification_events').insert({attempt_id:attempt.id,user_id:input.userId,provider,event_type:input.status,provider_event_id:input.providerEventId||null,correlation_id:input.correlationId,metadata:{contract_version:1,failure_code:input.failureCode||null}});
  if(eventError&&eventError.code!=='23505')throw eventError;
  return {status:profileStatus,verified};
}
