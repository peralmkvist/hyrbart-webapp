import {NextResponse} from 'next/server';
import {createHash} from 'crypto';
import {createAdminClient} from '@/lib/supabase/admin';
import {createAdminSession,getRequestIp,requestFingerprint,sameOrigin} from '@/lib/admin-auth';
import {recordAdminAction} from '@/lib/admin-audit';

const GENERIC_ERROR='INVALID_ADMIN_CREDENTIALS';

export async function POST(request:Request){
  if(!sameOrigin(request))return NextResponse.json({error:GENERIC_ERROR},{status:403});
  const body=await request.json().catch(()=>({}));
  const username=String(body.username||'').trim().toLowerCase().slice(0,64);
  const password=String(body.password||'');
  const ip=getRequestIp(request.headers);
  const {ipHash,userAgent}=requestFingerprint(ip,request.headers.get('user-agent'));
  const admin=createAdminClient();
  const since=new Date(Date.now()-15*60*1000).toISOString();
  const [{count:userFails},{count:ipFails}]=await Promise.all([
    admin.from('admin_login_events').select('id',{count:'exact',head:true}).eq('username',username||'_').eq('success',false).gte('created_at',since),
    ipHash?admin.from('admin_login_events').select('id',{count:'exact',head:true}).eq('ip_hash',ipHash).eq('success',false).gte('created_at',since):Promise.resolve({count:0}),
  ]);
  if((userFails||0)>=5||(ipFails||0)>=10){
    await admin.from('admin_login_events').insert({username:username||'_',success:false,reason:'rate_limited',ip_hash:ipHash,user_agent:userAgent});
    return NextResponse.json({error:GENERIC_ERROR},{status:429,headers:{'Cache-Control':'no-store'}});
  }
  if(!username||password.length<1){
    await admin.from('admin_login_events').insert({username:username||'_',success:false,reason:'invalid_credentials',ip_hash:ipHash,user_agent:userAgent});
    return NextResponse.json({error:GENERIC_ERROR},{status:401,headers:{'Cache-Control':'no-store'}});
  }
  const {data:rows,error}=await admin.rpc('admin_verify_password',{p_username:username,p_password:password});
  if(error)throw error;
  const row=Array.isArray(rows)?rows[0]:null;
  const locked=row?.locked_until&&new Date(row.locked_until).getTime()>Date.now();
  if(!row||!row.password_ok||!row.active||locked){
    if(row?.account_id){
      const nextFails=Math.min(99,Number((await admin.from('admin_accounts').select('failed_attempts').eq('id',row.account_id).single()).data?.failed_attempts||0)+1);
      const lockUntil=nextFails>=5?new Date(Date.now()+30*60*1000).toISOString():null;
      await admin.from('admin_accounts').update({failed_attempts:nextFails,locked_until:lockUntil,updated_at:new Date().toISOString()}).eq('id',row.account_id);
    }
    await admin.from('admin_login_events').insert({admin_account_id:row?.account_id||null,username,success:false,reason:locked?'locked':'invalid_credentials',ip_hash:ipHash,user_agent:userAgent});
    return NextResponse.json({error:GENERIC_ERROR},{status:401,headers:{'Cache-Control':'no-store'}});
  }
  const {data:membership}=await admin.from('admin_memberships').select('role,active').eq('user_id',row.user_id).maybeSingle();
  if(!membership?.active){
    await admin.from('admin_login_events').insert({admin_account_id:row.account_id,username,success:false,reason:'inactive_membership',ip_hash:ipHash,user_agent:userAgent});
    return NextResponse.json({error:GENERIC_ERROR},{status:401,headers:{'Cache-Control':'no-store'}});
  }
  await admin.from('admin_accounts').update({failed_attempts:0,locked_until:null,updated_at:new Date().toISOString()}).eq('id',row.account_id);
  const session=await createAdminSession(row.account_id);
  await admin.from('admin_login_events').insert({admin_account_id:row.account_id,username,success:true,reason:'password_ok',ip_hash:ipHash,user_agent:userAgent});
  await recordAdminAction({adminUserId:row.user_id,adminRole:membership.role,action:'admin_login_succeeded',entityType:'admin_session',entityId:session.id,metadata:{username,session_expires_at:session.expiresAt.toISOString(),device_hash:createHash('sha256').update(userAgent||'').digest('hex').slice(0,16)}});
  return NextResponse.json({ok:true},{headers:{'Cache-Control':'no-store'}});
}
