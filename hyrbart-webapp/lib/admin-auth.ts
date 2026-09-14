import 'server-only';
import {createHash,createHmac,randomBytes} from 'crypto';
import {cookies,headers} from 'next/headers';
import {createAdminClient} from '@/lib/supabase/admin';

export const ADMIN_SESSION_COOKIE='hyrbart_admin_session';
export const ADMIN_SESSION_HOURS=8;

export function hashAdminSessionToken(token:string){
  return createHash('sha256').update(token).digest('hex');
}

export function newAdminSessionToken(){
  return randomBytes(32).toString('base64url');
}

export function requestFingerprint(ip:string|null,userAgent:string|null){
  const secret=process.env.SUPABASE_SECRET_KEY||'hyrbart-admin-fingerprint';
  const ipHash=ip?createHmac('sha256',secret).update(ip).digest('hex'):null;
  return{ipHash,userAgent:(userAgent||'').slice(0,500)||null};
}

export function getRequestIp(h:Headers){
  return (h.get('x-forwarded-for')||'').split(',')[0]?.trim()||h.get('x-real-ip')||null;
}

export async function readAdminSessionToken(){
  return (await cookies()).get(ADMIN_SESSION_COOKIE)?.value||null;
}

export async function clearAdminSessionCookie(){
  const store=await cookies();
  store.set(ADMIN_SESSION_COOKIE,'',{httpOnly:true,secure:true,sameSite:'strict',path:'/',maxAge:0});
}

export async function setAdminSessionCookie(token:string,expiresAt:Date){
  const store=await cookies();
  store.set(ADMIN_SESSION_COOKIE,token,{httpOnly:true,secure:true,sameSite:'strict',path:'/',expires:expiresAt});
}

export async function createAdminSession(adminAccountId:string,mfaVerified=false){
  const token=newAdminSessionToken();
  const tokenHash=hashAdminSessionToken(token);
  const expiresAt=new Date(Date.now()+ADMIN_SESSION_HOURS*60*60*1000);
  const h=await headers();
  const {ipHash,userAgent}=requestFingerprint(getRequestIp(h),h.get('user-agent'));
  const admin=createAdminClient();
  const {data,error}=await admin.from('admin_sessions').insert({admin_account_id:adminAccountId,token_hash:tokenHash,expires_at:expiresAt.toISOString(),ip_hash:ipHash,user_agent:userAgent,mfa_verified:mfaVerified}).select('id').single();
  if(error)throw error;
  await setAdminSessionCookie(token,expiresAt);
  return{id:data.id,expiresAt,mfaVerified};
}

export function sameOrigin(request:Request){
  const origin=request.headers.get('origin');
  if(!origin)return true;
  try{return new URL(origin).host===new URL(request.url).host}catch{return false}
}
