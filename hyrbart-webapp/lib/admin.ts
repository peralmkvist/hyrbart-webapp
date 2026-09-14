import 'server-only';
import {createClient} from '@/lib/supabase/server';
import {createAdminClient} from '@/lib/supabase/admin';

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

function bootstrapEmails(){return(process.env.HYRBART_ADMIN_EMAILS||'').split(',').map(x=>x.trim().toLowerCase()).filter(Boolean)}

export function roleHasPermission(role:AdminRole,permission:AdminPermission){return ROLE_PERMISSIONS[role]?.has(permission)??false}
export function permissionsForRole(role:AdminRole){return Array.from(ROLE_PERMISSIONS[role]||[])}

export async function getAdminAccess(permission:AdminPermission='admin.access'){
  const s=await createClient();
  const {data:{user}}=await s.auth.getUser();
  if(!user)return null;
  const admin=createAdminClient();
  let {data:membership}=await admin.from('admin_memberships').select('role,active').eq('user_id',user.id).maybeSingle();

  // Backwards-compatible one-way bootstrap: configured legacy admin e-mails become super_admin.
  // After that, authorization is driven by the server-only membership table.
  if(!membership&&user.email&&bootstrapEmails().includes(user.email.toLowerCase())){
    const {data,error}=await admin.from('admin_memberships').upsert({user_id:user.id,role:'super_admin',active:true,granted_by:user.id,updated_at:new Date().toISOString()},{onConflict:'user_id'}).select('role,active').single();
    if(error)throw error;
    membership=data;
  }

  if(!membership?.active)return null;
  const role=membership.role as AdminRole;
  if(!roleHasPermission(role,permission))return null;
  return{user,role,permissions:permissionsForRole(role)};
}

export async function requireAdmin(permission:AdminPermission='admin.access'){
  const access=await getAdminAccess(permission);
  return access?.user??null;
}
