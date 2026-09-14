import {NextResponse} from 'next/server';
import {createAdminClient} from '@/lib/supabase/admin';
import {hashAdminSessionToken,readAdminSessionToken,sameOrigin} from '@/lib/admin-auth';
import {decryptMfaSecret,encryptMfaSecret,generateBase32Secret,generateRecoveryCodes,hashRecoveryCode,otpauthUri,verifyTotp} from '@/lib/admin-mfa';
import {recordAdminAction} from '@/lib/admin-audit';

async function pendingSession(){
  const token=await readAdminSessionToken();
  if(!token)return null;
  const admin=createAdminClient();
  const {data:session}=await admin.from('admin_sessions').select('id,admin_account_id,expires_at,revoked_at,mfa_verified').eq('token_hash',hashAdminSessionToken(token)).maybeSingle();
  if(!session||session.revoked_at||new Date(session.expires_at).getTime()<=Date.now())return null;
  const {data:account}=await admin.from('admin_accounts').select('id,user_id,username,active,mfa_enabled,mfa_secret_encrypted').eq('id',session.admin_account_id).maybeSingle();
  if(!account?.active)return null;
  const {data:membership}=await admin.from('admin_memberships').select('role,active').eq('user_id',account.user_id).maybeSingle();
  if(!membership?.active)return null;
  return{admin,session,account,membership};
}

export async function GET(){
  const ctx=await pendingSession();
  if(!ctx)return NextResponse.json({error:'UNAUTHENTICATED'},{status:401,headers:{'Cache-Control':'no-store'}});
  return NextResponse.json({mfaEnabled:ctx.account.mfa_enabled,mfaVerified:ctx.session.mfa_verified,username:ctx.account.username},{headers:{'Cache-Control':'no-store'}});
}

export async function POST(request:Request){
  if(!sameOrigin(request))return NextResponse.json({error:'FORBIDDEN'},{status:403});
  const ctx=await pendingSession();
  if(!ctx)return NextResponse.json({error:'UNAUTHENTICATED'},{status:401});
  const body=await request.json().catch(()=>({}));
  const action=String(body.action||'');

  if(action==='begin'){
    if(ctx.account.mfa_enabled)return NextResponse.json({error:'ALREADY_ENABLED'},{status:409});
    const secret=generateBase32Secret();
    await ctx.admin.from('admin_accounts').update({mfa_secret_encrypted:encryptMfaSecret(secret),updated_at:new Date().toISOString()}).eq('id',ctx.account.id);
    await recordAdminAction({adminUserId:ctx.account.user_id,adminRole:ctx.membership.role,action:'admin_mfa_enrollment_started',entityType:'admin_account',entityId:ctx.account.id,metadata:{username:ctx.account.username}});
    return NextResponse.json({secret,otpauthUri:otpauthUri(ctx.account.username,secret)},{headers:{'Cache-Control':'no-store'}});
  }

  if(action==='confirm'){
    const code=String(body.code||'');
    const {data:fresh,error:freshError}=await ctx.admin.from('admin_accounts').select('mfa_secret_encrypted,mfa_enabled').eq('id',ctx.account.id).single();
    if(freshError||!fresh)return NextResponse.json({error:'ACCOUNT_NOT_FOUND'},{status:404});
    if(fresh.mfa_enabled)return NextResponse.json({error:'ALREADY_ENABLED'},{status:409});
    if(!fresh.mfa_secret_encrypted)return NextResponse.json({error:'ENROLLMENT_NOT_STARTED'},{status:409});
    const secret=decryptMfaSecret(fresh.mfa_secret_encrypted);
    if(!verifyTotp(secret,code))return NextResponse.json({error:'INVALID_CODE'},{status:400});
    const recoveryCodes=generateRecoveryCodes(10);
    await ctx.admin.from('admin_recovery_codes').delete().eq('admin_account_id',ctx.account.id);
    const {error:codesError}=await ctx.admin.from('admin_recovery_codes').insert(recoveryCodes.map(codeValue=>({admin_account_id:ctx.account.id,code_hash:hashRecoveryCode(codeValue)})));
    if(codesError)throw codesError;
    const now=new Date().toISOString();
    await ctx.admin.from('admin_accounts').update({mfa_enabled:true,mfa_enabled_at:now,updated_at:now}).eq('id',ctx.account.id);
    await ctx.admin.from('admin_sessions').update({mfa_verified:true,last_seen_at:now}).eq('id',ctx.session.id);
    await recordAdminAction({adminUserId:ctx.account.user_id,adminRole:ctx.membership.role,action:'admin_mfa_enabled',entityType:'admin_account',entityId:ctx.account.id,metadata:{username:ctx.account.username,recovery_codes_issued:recoveryCodes.length}});
    return NextResponse.json({ok:true,recoveryCodes},{headers:{'Cache-Control':'no-store'}});
  }

  return NextResponse.json({error:'UNKNOWN_ACTION'},{status:400});
}
