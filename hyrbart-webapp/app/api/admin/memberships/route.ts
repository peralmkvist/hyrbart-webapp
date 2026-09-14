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
  const role=String(body.role||'') as AdminRole;
  const active=body.active!==false;
  if(!ROLES.has(role))return NextResponse.json({error:'INVALID_MEMBERSHIP'},{status:400});
  const admin=createAdminClient();
  let userId=String(body.userId||'').trim();
  let targetEmail=String(body.email||'').trim().toLowerCase();
  if(!userId&&targetEmail){
    const usersResult=await admin.auth.admin.listUsers({page:1,perPage:1000});
    const found=(usersResult.data?.users||[]).find(user=>user.email?.toLowerCase()===targetEmail);
    if(found)userId=found.id;
  }
  if(!userId)return NextResponse.json({error:'USER_NOT_FOUND'},{status:404});
  if(userId===access.user.id&&(!active||role!=='super_admin'))return NextResponse.json({error:'SELF_LOCKOUT_BLOCKED'},{status:409});
  const {data:target,error:targetError}=await admin.auth.admin.getUserById(userId);
  if(targetError||!target.user)return NextResponse.json({error:'USER_NOT_FOUND'},{status:404});
  targetEmail=target.user.email||targetEmail||'';
  const {data,error}=await admin.from('admin_memberships').upsert({user_id:userId,role,active,granted_by:access.user.id,updated_at:new Date().toISOString()},{onConflict:'user_id'}).select('user_id,role,active,granted_by,granted_at,updated_at').single();
  if(error)throw error;
  await recordAdminAction({adminUserId:access.user.id,adminRole:access.role,action:'admin_membership_changed',entityType:'admin_user',entityId:userId,metadata:{role,active,email:targetEmail||null}});
  return NextResponse.json({ok:true,membership:{...data,email:targetEmail||null}});
}
