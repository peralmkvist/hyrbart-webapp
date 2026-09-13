import Link from 'next/link';
import { redirect } from 'next/navigation';
import { requireAdmin } from '@/lib/admin';
import { createAdminClient } from '@/lib/supabase/admin';

export default async function AdminAudit({params}:{params:Promise<{locale:string}>}){
  const {locale}=await params;
  const user=await requireAdmin();
  if(!user)redirect(`/${locale}`);
  const admin=createAdminClient();
  const {data:rows}=await admin.from('admin_audit_log').select('*').order('created_at',{ascending:false}).limit(200);

  return <main className="adminPage">
    <header className="adminHeader"><div><span>HYRBART SECURITY</span><h1>Audit log</h1><p>Privat historik över administrativa beslut och ändringar. Den här informationen exponeras inte för vanliga användare.</p><Link href={`/${locale}/admin`} style={{display:'inline-block',marginTop:10}}>← Adminöversikt</Link></div><div className="adminAvatar">H</div></header>
    <div className="adminQueue">{(rows||[]).map((row:any)=><div key={row.id} className="adminCaseRow" style={{cursor:'default'}}><div className="adminStatus resolved"/><div><span>{new Date(row.created_at).toLocaleString('sv-SE')} · {row.entity_type}</span><strong>{row.action}</strong><small>{row.entity_id||'—'}</small></div><code style={{fontSize:11,maxWidth:320,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{JSON.stringify(row.metadata||{})}</code></div>)}{!(rows||[]).length?<div className="adminEmpty">Ingen adminaktivitet loggad ännu.</div>:null}</div>
  </main>;
}
