import {NextResponse} from 'next/server';
import {getAdminAccess} from '@/lib/admin';
import {sameOrigin} from '@/lib/admin-auth';
import {createAdminClient} from '@/lib/supabase/admin';
import {recordAdminAction} from '@/lib/admin-audit';

export async function GET(){
  const access=await getAdminAccess('roles.manage');
  if(!access)return NextResponse.json({error:'FORBIDDEN'},{status:403});
  const admin=createAdminClient();
  const [{data:accounts,error},usersResult,{data:memberships}]=await Promise.all([
    admin.from('admin_accounts').select('id,user_id,username,active,failed_attempts,locked_until,password_changed_at,mfa_enabled,created_at,updated_at').order('created_at',{ascending:true}),
    admin.auth.admin.listUsers({page:1,perPage:1000}),
    admin.from('admin_memberships').select('user_id,role,active'),
  ]);
  if(error)throw error;
  const emailById=new Map((usersResult.data?.users||[]).map(u=>[u.id,u.email||null]));
  const membershipById=new Map((memberships||[]).map(m=>[m.user_id,m]));
  return NextResponse.json({accounts:(accounts||[]).map(a=>({...a,email:emailById.get(a.user_id)||null,membership:membershipById.get(a.user_id)||null}))},{headers:{'Cache-Control':'no-store'}});
}

export async function POST(request:Request){
  if(!sameOrigin(request))return NextResponse.json({error:'FORBIDDEN'},{status:403});
  const access=await getAdminAccess('roles.manage');
  if(!access)return NextResponse.json({error:'FORBIDDEN'},{status:403});
  const body=await request.json().catch(()=>({}));
  const action=String(body.action||'');
  const admin=createAdminClient();

  if(action==='create'){
    const email=String(body.email||'').trim().toLowerCase();
    const username=String(body.username||'').trim().toLowerCase();
    const password=String(body.password||'');
    if(password.length<12)return NextResponse.json({error:'PASSWORD_TOO_SHORT'},{status:400});
    const users=await admin.auth.admin.listUsers({page:1,perPage:1000});
    const target=users.data?.users.find(u=>u.email?.toLowerCase()===email);
    if(!target)return NextResponse.json({error:'USER_NOT_FOUND'},{status:404});
    const {data:membership}=await admin.from('admin_memberships').select('role,active').eq('user_id',target.id).maybeSingle();
    if(!membership?.active)return NextResponse.json({error:'ACTIVE_ROLE_REQUIRED'},{status:409});
    const {data:accountId,error}=await admin.rpc('admin_create_account',{p_user_id:target.id,p_username:username,p_password:password,p_created_by:access.user.id});
    if(error)return NextResponse.json({error:error.message.includes('duplicate')?'ACCOUNT_EXISTS':'ACCOUNT_CREATE_FAILED'},{status:409});
    await recordAdminAction({adminUserId:access.user.id,adminRole:access.role,action:'admin_account_created',entityType:'admin_account',entityId:accountId,metadata:{target_user_id:target.id,email,username,role:membership.role}});
    return NextResponse.json({ok:true,accountId});
  }

  const accountId=String(body.accountId||'');
  const {data:account}=await admin.from('admin_accounts').select('id,user_id,username,active').eq('id',accountId).maybeSingle();
  if(!account)return NextResponse.json({error:'ACCOUNT_NOT_FOUND'},{status:404});
  if(account.user_id===access.user.id&&action==='set_active'&&body.active===false)return NextResponse.json({error:'SELF_LOCKOUT_BLOCKED'},{status:409});

  if(action==='set_active'){
    const active=body.active===true;
    await admin.from('admin_accounts').update({active,updated_at:new Date().toISOString(),failed_attempts:0,locked_until:null}).eq('id',accountId);
    if(!active)await admin.from('admin_sessions').update({revoked_at:new Date().toISOString(),revoke_reason:'account_disabled'}).eq('admin_account_id',accountId).is('revoked_at',null);
    await recordAdminAction({adminUserId:access.user.id,adminRole:access.role,action:active?'admin_account_activated':'admin_account_disabled',entityType:'admin_account',entityId:accountId,metadata:{target_user_id:account.user_id,username:account.username}});
    return NextResponse.json({ok:true});
  }

  if(action==='reset_password'){
    const password=String(body.password||'');
    if(password.length<12)return NextResponse.json({error:'PASSWORD_TOO_SHORT'},{status:400});
    const {error}=await admin.rpc('admin_set_password',{p_account_id:accountId,p_password:password});
    if(error)throw error;
    await admin.from('admin_sessions').update({revoked_at:new Date().toISOString(),revoke_reason:'password_reset'}).eq('admin_account_id',accountId).is('revoked_at',null);
    await recordAdminAction({adminUserId:access.user.id,adminRole:access.role,action:'admin_password_reset',entityType:'admin_account',entityId:accountId,metadata:{target_user_id:account.user_id,username:account.username}});
    return NextResponse.json({ok:true});
  }

  if(action==='revoke_sessions'){
    const {count}=await admin.from('admin_sessions').update({revoked_at:new Date().toISOString(),revoke_reason:'admin_revoked'}).eq('admin_account_id',accountId).is('revoked_at',null).select('id',{count:'exact',head:true});
    await recordAdminAction({adminUserId:access.user.id,adminRole:access.role,action:'admin_sessions_revoked',entityType:'admin_account',entityId:accountId,metadata:{target_user_id:account.user_id,username:account.username,count:count||0}});
    return NextResponse.json({ok:true});
  }

  return NextResponse.json({error:'UNKNOWN_ACTION'},{status:400});
}
