import Link from 'next/link';
import {redirect} from 'next/navigation';
import {getAdminAccess} from '@/lib/admin';
import {createAdminClient} from '@/lib/supabase/admin';
import AdminAccountManager from '@/components/AdminAccountManager';

export default async function AdminSecurityPage({params}:{params:Promise<{locale:string}>}){
  const {locale}=await params;
  const access=await getAdminAccess('roles.manage');
  if(!access)redirect(`/${locale}/admin`);
  const admin=createAdminClient();
  const {data:events}=await admin.from('admin_login_events').select('id,username,success,reason,user_agent,created_at').order('created_at',{ascending:false}).limit(50);
  return <main className="adminPage">
    <header className="adminHeader"><div><span>HYRBART SECURITY</span><h1>Admininloggning</h1><p>Separata adminkonton, lösenord, spärrar och sessioner. Vanliga Hyrbart-sessioner ger inte adminåtkomst.</p><Link href={`/${locale}/admin`} style={{display:'inline-block',marginTop:10}}>← Adminöversikt</Link></div><div className="adminAvatar">S</div></header>
    <AdminAccountManager/>
    <section style={{marginTop:28}}>
      <h2>Senaste inloggningsförsök</h2>
      <p style={{color:'var(--muted)'}}>Lyckade och misslyckade admininloggningar. IP lagras endast som server-saltad hash.</p>
      <div className="adminQueue">{(events||[]).map((event:any)=><div key={event.id} className="adminCaseRow" style={{cursor:'default'}}><div className={`adminStatus ${event.success?'resolved':'rejected'}`}/><div><span>{new Date(event.created_at).toLocaleString('sv-SE')} · {event.success?'LYCKAD':'NEKAD'}</span><strong>{event.username}</strong><small>{event.reason} · {event.user_agent||'okänd klient'}</small></div></div>)}{!(events||[]).length?<div className="adminEmpty">Inga admininloggningsförsök ännu.</div>:null}</div>
    </section>
  </main>;
}
