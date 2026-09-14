import 'server-only';
import {createAdminClient} from '@/lib/supabase/admin';
import {hashAdminSessionToken,readAdminSessionToken} from '@/lib/admin-auth';

export type AdminRole='super_admin'|'support'|'trust_safety'|'finance'|'operations'|'read_only';
export type AdminPermission=
  |'admin.access'|'users.read'|'users.manage'|'bookings.read'|'cases.manage'|'risk.manage'
  |'finance.manage'|'imports.manage'|'reviews.manage'|'audit.read'|'audit.export'|'roles.manage';

const ROLE_PERMISSIONS:Record<AdminRole,ReadonlySet<AdminPermission>>={
  super_admin:new Set<AdminPermission>(['admin.access','users.read','users.manage','bookings.read','cases.manage','risk.manage','finance.manage','imports.manage','reviews.manage','audit.read','audit.export','roles.manage']),
  support:new Set<AdminPermission>(['admin.access','users.read','users.manage','bookings.read','cases.manage','reviews.manage','audit.read','audit.export']),
  trust_safety:new Set<AdminPermission>(['admin.access','users.read','users.manage','bookings.read','cases.manage','risk.manage','reviews.manage','audit.read','audit.export']),
  finance:new Set<AdminPermission>(['admin.access','users.read','bookings.read','finance.manage','audit.read','audit.export']),
  operations:new Set<AdminPermission>(['admin.access','users.read','bookings.read','imports.manage','reviews.manage','audit.read','audit.export']),
  read_only:new Set<AdminPermission>(['admin.access','users.read','bookings.read','audit.read']),
};

export function roleHasPermission(role:AdminRole,permission:AdminPermission){return ROLE_PERMISSIONS[role]?.has(permission)??false}
export function permissionsForRole(role:AdminRole){return Array.from(ROLE_PERMISSIONS[role]||[])}

export async function getAdminAccess(permission:AdminPermission='admin.access'){
  const token=await readAdminSessionToken();
  if(!token)return null;
  const admin=createAdminClient();
  const tokenHash=hashAdminSessionToken(token);
  const {data:session,error:sessionError}=await admin.from('admin_sessions').select('id,admin_account_id,expires_at,last_seen_at,revoked_at').eq('token_hash',tokenHash).maybeSingle();
  if(sessionError)throw sessionError;
  if(!session||session.revoked_at||new Date(session.expires_at).getTime()<=Date.now())return null;

  const {data:account,error:accountError}=await admin.from('admin_accounts').select('id,user_id,active,locked_until').eq('id',session.admin_account_id).maybeSingle();
  if(accountError)throw accountError;
  if(!account?.active||(account.locked_until&&new Date(account.locked_until).getTime()>Date.now()))return null;

  const {data:membership,error:membershipError}=await admin.from('admin_memberships').select('role,active').eq('user_id',account.user_id).maybeSingle();
  if(membershipError)throw membershipError;
  if(!membership?.active)return null;
  const role=membership.role as AdminRole;
  if(!roleHasPermission(role,permission))return null;

  const {data:userResult,error:userError}=await admin.auth.admin.getUserById(account.user_id);
  if(userError||!userResult.user)return null;

  const lastSeen=new Date(session.last_seen_at).getTime();
  if(Date.now()-lastSeen>5*60*1000){
    void admin.from('admin_sessions').update({last_seen_at:new Date().toISOString()}).eq('id',session.id);
  }

  return{user:userResult.user,role,permissions:permissionsForRole(role),sessionId:session.id,adminAccountId:account.id};
}

export async function requireAdmin(permission:AdminPermission='admin.access'){
  const access=await getAdminAccess(permission);
  return access?.user??null;
}
