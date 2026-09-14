import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getAdminAccess } from '@/lib/admin';
import { createAdminClient } from '@/lib/supabase/admin';

function badge(severity:string){
  const style:React.CSSProperties={fontSize:11,fontWeight:900,textTransform:'uppercase',letterSpacing:'.06em',padding:'4px 8px',borderRadius:999,background:severity==='critical'?'#ffe5e5':severity==='error'?'#fff0e0':severity==='warning'?'#fff8cf':'#eef3ff'};
  return <span style={style}>{severity}</span>;
}

export default async function OperationsPage({params,searchParams}:{params:Promise<{locale:string}>;searchParams:Promise<{correlation?:string}>}){
  const {locale}=await params;
  const {correlation}=await searchParams;
  const access=await getAdminAccess('audit.read');
  if(!access)redirect(`/${locale}/admin-inloggning`);
  const admin=createAdminClient();
  let query=admin.from('operational_events').select('id,correlation_id,severity,event_type,source,route,entity_type,entity_id,message,metadata,created_at').order('created_at',{ascending:false}).limit(100);
  if(correlation)query=query.eq('correlation_id',correlation);
  const {data:events,error}=await query;
  if(error)throw error;
  const rows=events||[];
  const critical=rows.filter(x=>x.severity==='critical').length;
  const errors=rows.filter(x=>x.severity==='error').length;
  const warnings=rows.filter(x=>x.severity==='warning').length;

  return <main className="adminPage">
    <header className="adminHeader"><div><span>HYRBART ADMIN</span><h1>Drift & larm</h1><p>Strukturerade driftfel och korrelationsspår. Senaste 100 persistenta händelser.</p></div></header>
    <p><Link href={`/${locale}/admin`}>← Till adminöversikten</Link></p>
    <section style={{display:'flex',gap:10,flexWrap:'wrap',margin:'14px 0 18px'}}><Link className="modeSwitchButton" href={`/${locale}/admin/drift/playbook`}>Incident- & supportplaybook →</Link><Link className="modeSwitchButton" href={`/${locale}/admin/drift/backup`}>Backup & återställning →</Link><a className="modeSwitchButton" href="/api/health" target="_blank" rel="noreferrer">Health check →</a></section>
    <div className="adminStats" style={{gridTemplateColumns:'repeat(3,minmax(100px,1fr))'}}><div><b>{critical}</b><span>Kritiska</span></div><div><b>{errors}</b><span>Fel</span></div><div><b>{warnings}</b><span>Varningar</span></div></div>
    {correlation?<section style={{margin:'16px 0',padding:14,border:'1px solid var(--line)',borderRadius:16}}><strong>Trace: {correlation}</strong> <Link href={`/${locale}/admin/drift`}>Rensa filter</Link></section>:null}
    <section className="adminQueue">
      {rows.map((event:any)=><div key={event.id} className="adminCaseRow" style={{gridTemplateColumns:'auto 1fr'}}>
        <div>{badge(event.severity)}</div>
        <div><span>{new Date(event.created_at).toLocaleString('sv-SE')} · {event.source}</span><strong>{event.message}</strong><small>{event.event_type}{event.route?` · ${event.route}`:''}{event.entity_id?` · ${event.entity_type}:${event.entity_id}`:''}</small><small><Link href={`/${locale}/admin/drift?correlation=${encodeURIComponent(event.correlation_id)}`}>Trace {event.correlation_id}</Link></small></div>
      </div>)}
      {!rows.length?<div className="adminEmpty">Inga persistenta driftlarm i urvalet.</div>:null}
    </section>
  </main>;
}
