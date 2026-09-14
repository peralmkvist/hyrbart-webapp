import {NextResponse} from 'next/server';
import {createClient} from '@/lib/supabase/server';
import {createAdminClient} from '@/lib/supabase/admin';
import {createAdminSession,sameOrigin} from '@/lib/admin-auth';
import {recordAdminAction} from '@/lib/admin-audit';

function bootstrapEmails(){return(process.env.HYRBART_ADMIN_EMAILS||'').split(',').map(x=>x.trim().toLowerCase()).filter(Boolean)}

export async function POST(request:Request){
  if(!sameOrigin(request))return NextResponse.json({error:'FORBIDDEN'},{status:403});
  const s=await createClient();
  const {data:{user}}=await s.auth.getUser();
  if(!user)return NextResponse.json({error:'UNAUTHENTICATED'},{status:401});
  const admin=createAdminClient();
  const {count}=await admin.from('admin_accounts').select('id',{count:'exact',head:true});
  if((count||0)>0)return NextResponse.json({error:'BOOTSTRAP_CLOSED'},{status:409});
  let {data:membership}=await admin.from('admin_memberships').select('role,active').eq('user_id',user.id).maybeSingle();
  if((!membership||membership.role!=='super_admin'||!membership.active)&&user.email&&bootstrapEmails().includes(user.email.toLowerCase())){
    const {data,error}=await admin.from('admin_memberships').upsert({user_id:user.id,role:'super_admin',active:true,granted_by:user.id,updated_at:new Date().toISOString()},{onConflict:'user_id'}).select('role,active').single();
    if(error)throw error;
    membership=data;
  }
  if(!membership?.active||membership.role!=='super_admin')return NextResponse.json({error:'FORBIDDEN'},{status:403});
  const body=await request.json().catch(()=>({}));
  const username=String(body.username||'').trim().toLowerCase();
  const password=String(body.password||'');
  if(password.length<12)return NextResponse.json({error:'PASSWORD_TOO_SHORT'},{status:400});
  const {data:accountId,error}=await admin.rpc('admin_create_account',{p_user_id:user.id,p_username:username,p_password:password,p_created_by:user.id});
  if(error)return NextResponse.json({error:error.message.includes('INVALID_USERNAME')?'INVALID_USERNAME':'BOOTSTRAP_FAILED'},{status:400});
  const session=await createAdminSession(accountId);
  await recordAdminAction({adminUserId:user.id,adminRole:'super_admin',action:'admin_account_bootstrapped',entityType:'admin_account',entityId:accountId,metadata:{username,session_id:session.id}});
  return NextResponse.json({ok:true});
}
