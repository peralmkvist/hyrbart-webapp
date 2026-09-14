import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getAdminAccess } from '@/lib/admin';
import { createAdminClient } from '@/lib/supabase/admin';

export default async function AdminAudit({params}:{params:Promise<{locale:string}>}){
  const {locale}=await params;
  const access=await getAdminAccess('audit.read');
  if(!access)redirect(`/${locale}`);
  const admin=createAdminClient();
  const {data:rows}=await admin.from('admin_audit_log').select('*').order('created_at',{ascending:false}).limit(200);
  const canExport=access.permissions.includes('audit.export');
  const canManageRoles=access.permissions.includes('roles.manage');

  return <main className="adminPage">
    <header className="adminHeader"><div><span>HYRBART SECURITY</span><h1>Audit log</h1><p>Append-only historik över administrativa beslut och ändringar. Rollen vid åtgärdstillfället sparas tillsammans med händelsen.</p><div style={{display:'flex',gap:12,flexWrap:'wrap',marginTop:10}}><Link href={`/${locale}/admin`}>← Adminöversikt</Link>{canExport?<a href="/api/admin/audit/export">Exportera CSV</a>:null}{canManageRoles?<Link href={`/${locale}/admin/roller`}>Roller & behörigheter</Link>:null}{canManageRoles?<Link href={`/${locale}/admin/sakerhet`}>Admininloggning & sessioner</Link>:null}</div></div><div className="adminAvatar">H</div></header>
    <div className="adminQueue">{(rows||[]).map((row:any)=><div key={row.id} className="adminCaseRow" style={{cursor:'default'}}><div className="adminStatus resolved"/><div><span>{new Date(row.created_at).toLocaleString('sv-SE')} · {row.entity_type} · {row.admin_role||'legacy'}</span><strong>{row.action}</strong><small>{row.entity_id||'—'}{row.request_id?` · ${row.request_id}`:''}</small></div><code style={{fontSize:11,maxWidth:320,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{JSON.stringify(row.metadata||{})}</code></div>)}{!(rows||[]).length?<div className="adminEmpty">Ingen adminaktivitet loggad ännu.</div>:null}</div>
  </main>;
}
