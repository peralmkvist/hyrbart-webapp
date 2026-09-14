import {NextResponse} from 'next/server';
import {getAdminAccess, type AdminRole} from '@/lib/admin';
import {recordAdminAction} from '@/lib/admin-audit';
import {createAdminClient} from '@/lib/supabase/admin';

const ROLES=new Set<AdminRole>(['super_admin','support','trust_safety','finance','operations','read_only']);

export async function GET(){
  const access=await getAdminAccess('roles.manage');
  if(!access)return NextResponse.json({error:'FORBIDDEN'},{status:403});
  const admin=createAdminClient();
  const [{data:memberships,error},usersResult]=await Promise.all([
    admin.from('admin_memberships').select('user_id,role,active,granted_by,granted_at,updated_at').order('granted_at',{ascending:true}),
    admin.auth.admin.listUsers({page:1,perPage:1000}),
  ]);
  if(error)throw error;
  const emailById=new Map((usersResult.data?.users||[]).map(user=>[user.id,user.email||null]));
  return NextResponse.json({memberships:(memberships||[]).map(row=>({...row,email:emailById.get(row.user_id)||null}))});
}

export async function POST(request:Request){
  const access=await getAdminAccess('roles.manage');
  if(!access)return NextResponse.json({error:'FORBIDDEN'},{status:403});
  const body=await request.json().catch(()=>({}));
  const userId=String(body.userId||'');
  const role=String(body.role||'') as AdminRole;
  const active=body.active!==false;
  if(!userId||!ROLES.has(role))return NextResponse.json({error:'INVALID_MEMBERSHIP'},{status:400});
  if(userId===access.user.id&&(!active||role!=='super_admin'))return NextResponse.json({error:'SELF_LOCKOUT_BLOCKED'},{status:409});
  const admin=createAdminClient();
  const {data:target,error:targetError}=await admin.auth.admin.getUserById(userId);
  if(targetError||!target.user)return NextResponse.json({error:'USER_NOT_FOUND'},{status:404});
  const {data,error}=await admin.from('admin_memberships').upsert({user_id:userId,role,active,granted_by:access.user.id,updated_at:new Date().toISOString()},{onConflict:'user_id'}).select('user_id,role,active,granted_by,granted_at,updated_at').single();
  if(error)throw error;
  await recordAdminAction({adminUserId:access.user.id,adminRole:access.role,action:'admin_membership_changed',entityType:'admin_user',entityId:userId,metadata:{role,active,email:target.user.email||null}});
  return NextResponse.json({ok:true,membership:{...data,email:target.user.email||null}});
}
