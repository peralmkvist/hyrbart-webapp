import Link from 'next/link';
import { redirect } from 'next/navigation';
import { requireAdmin } from '@/lib/admin';
import { createAdminClient } from '@/lib/supabase/admin';

const severityRank:Record<string,number>={critical:0,high:1,medium:2,low:3};

export default async function AdminRiskQueue({params,searchParams}:{params:Promise<{locale:string}>;searchParams:Promise<{status?:string;severity?:string}>}){
  const {locale}=await params;
  const {status='active',severity='all'}=await searchParams;
  const user=await requireAdmin();
  if(!user)redirect(`/${locale}`);
  const admin=createAdminClient();

  let query=admin.from('risk_flags').select('id,user_id,booking_id,severity,status,reason,created_at,resolved_at').order('created_at',{ascending:true}).limit(250);
  if(status==='active')query=query.in('status',['open','reviewing']);
  else if(['open','reviewing','resolved','dismissed'].includes(status))query=query.eq('status',status);
  if(['low','medium','high','critical'].includes(severity))query=query.eq('severity',severity);
  const {data:flags,error}=await query;
  if(error)throw error;

  const userIds=[...new Set((flags||[]).map((flag:any)=>flag.user_id).filter(Boolean))];
  const {data:profiles}=userIds.length
    ? await admin.from('profiles').select('id,display_name,account_status').in('id',userIds)
    : {data:[] as any[]};
  const profileById=new Map((profiles||[]).map((profile:any)=>[profile.id,profile]));
  const rows=[...(flags||[])].sort((a:any,b:any)=>(severityRank[a.severity]??9)-(severityRank[b.severity]??9)||new Date(a.created_at).getTime()-new Date(b.created_at).getTime());

  const active=(flags||[]).filter((flag:any)=>['open','reviewing'].includes(flag.status)).length;
  const critical=(flags||[]).filter((flag:any)=>flag.severity==='critical'&&['open','reviewing'].includes(flag.status)).length;
  const high=(flags||[]).filter((flag:any)=>flag.severity==='high'&&['open','reviewing'].includes(flag.status)).length;

  const filterHref=(nextStatus:string,nextSeverity:string)=>`/${locale}/admin/risk?status=${nextStatus}&severity=${nextSeverity}`;

  return <main className="adminPage">
    <header className="adminHeader"><div><span>HYRBART TRUST & SAFETY</span><h1>Riskflaggor</h1><p>Central arbetskö för manuella riskflaggor. Hantering sker på användarsidan och loggas i admin audit.</p><Link href={`/${locale}/admin`} style={{display:'inline-block',marginTop:10}}>← Adminöversikt</Link></div><div className="adminAvatar">H</div></header>

    <div className="adminStats" style={{gridTemplateColumns:'repeat(auto-fit,minmax(140px,1fr))'}}>
      <div><b>{active}</b><span>Aktiva i urvalet</span></div><div><b>{critical}</b><span>Kritiska</span></div><div><b>{high}</b><span>Höga</span></div><div><b>{rows.length}</b><span>Visade flaggor</span></div>
    </div>

    <section style={{display:'flex',gap:8,flexWrap:'wrap',margin:'18px 0'}}>
      {['active','open','reviewing','resolved','dismissed','all'].map(value=><Link key={value} href={filterHref(value,severity)} className="modeSwitchButton" style={{padding:'8px 12px',opacity:status===value?1:.6}}>{value==='active'?'Aktiva':value==='open'?'Öppna':value==='reviewing'?'Under granskning':value==='resolved'?'Lösta':value==='dismissed'?'Avfärdade':'Alla'}</Link>)}
    </section>
    <section style={{display:'flex',gap:8,flexWrap:'wrap',margin:'0 0 18px'}}>
      {['all','critical','high','medium','low'].map(value=><Link key={value} href={filterHref(status,value)} className="modeSwitchButton" style={{padding:'8px 12px',opacity:severity===value?1:.6}}>{value==='all'?'Alla nivåer':value==='critical'?'Kritisk':value==='high'?'Hög':value==='medium'?'Medel':'Låg'}</Link>)}
    </section>

    <section className="adminQueue">
      {rows.map((flag:any)=>{const profile=profileById.get(flag.user_id) as any;return <Link key={flag.id} href={`/${locale}/admin/anvandare/${flag.user_id}`} className="adminCaseRow">
        <div className={`adminStatus ${flag.severity==='critical'||flag.severity==='high'?'rejected':flag.status==='resolved'?'resolved':'open'}`}/>
        <div><span>{flag.severity.toUpperCase()} · {flag.status} · {new Date(flag.created_at).toLocaleString('sv-SE')}</span><strong>{flag.reason}</strong><small>{profile?.display_name||flag.user_id.slice(0,8).toUpperCase()} · konto {profile?.account_status||'okänt'}{flag.booking_id?` · bokning ${flag.booking_id.slice(0,8).toUpperCase()}`:''}</small></div>
        <b>{['open','reviewing'].includes(flag.status)?'Hantera':'Visa'}</b><i>›</i>
      </Link>})}
      {!rows.length?<div className="adminEmpty">Inga riskflaggor matchar filtret.</div>:null}
    </section>
  </main>;
}
