import Link from 'next/link';
import { redirect } from 'next/navigation';
import { requireAdmin } from '@/lib/admin';
import { createAdminClient } from '@/lib/supabase/admin';

async function exactCount(query:PromiseLike<{count:number|null;error:any}>){
  const {count,error}=await query;
  if(error)throw error;
  return count||0;
}

export default async function AdminOverview({params}:{params:Promise<{locale:string}>}){
  const {locale}=await params;
  const user=await requireAdmin();
  if(!user)redirect(`/${locale}`);
  const admin=createAdminClient();

  const [users,bookings,activeCases,activeFlags,restrictedUsers,pendingReputation,pendingImports,payments,scheduledPayouts,heldPayouts,recentResult,caseResult,flagResult]=await Promise.all([
    exactCount(admin.from('profiles').select('id',{count:'exact',head:true})),
    exactCount(admin.from('bookings').select('id',{count:'exact',head:true})),
    exactCount(admin.from('booking_cases').select('id',{count:'exact',head:true}).in('status',['open','awaiting_other_party','under_review'])),
    exactCount(admin.from('risk_flags').select('id',{count:'exact',head:true}).in('status',['open','reviewing'])),
    exactCount(admin.from('profiles').select('id',{count:'exact',head:true}).in('account_status',['restricted','frozen'])),
    exactCount(admin.from('external_reputation_claims').select('id',{count:'exact',head:true}).eq('status','pending')),
    exactCount(admin.from('listing_import_jobs').select('id',{count:'exact',head:true}).in('status',['pending','processing','needs_review','ready'])),
    exactCount(admin.from('booking_payments').select('id',{count:'exact',head:true})),
    exactCount(admin.from('booking_payouts').select('id',{count:'exact',head:true}).eq('status','scheduled')),
    exactCount(admin.from('booking_payouts').select('id',{count:'exact',head:true}).eq('status','pending')),
    admin.from('bookings').select('id,status,start_date,end_date,total_price,created_at').order('created_at',{ascending:false}).limit(8),
    admin.from('booking_cases').select('id,booking_id,opened_by,status,case_type,reason,created_at').in('status',['open','awaiting_other_party','under_review']).order('created_at',{ascending:true}).limit(8),
    admin.from('risk_flags').select('id,user_id,booking_id,severity,status,reason,created_at').in('status',['open','reviewing']).order('created_at',{ascending:true}).limit(8),
  ]);
  const recent=recentResult.data||[];
  const actionCases=caseResult.data||[];
  const actionFlags=flagResult.data||[];
  const actionTotal=activeCases+activeFlags+restrictedUsers+pendingReputation+pendingImports+heldPayouts;

  return <main className="adminPage">
    <header className="adminHeader"><div><span>HYRBART ADMIN</span><h1>Översikt</h1><p>Drift, trygghet och marknadsplatsflöden.</p></div><div className="adminAvatar">H</div></header>

    <section style={{background:actionTotal?'#f7ffd9':'#fff',border:'1px solid var(--line)',borderRadius:20,padding:'18px 20px',margin:'18px 0'}}><span style={{fontSize:12,fontWeight:900,letterSpacing:'.08em'}}>KRÄVER ÅTGÄRD</span><div style={{display:'flex',gap:16,alignItems:'baseline',flexWrap:'wrap',marginTop:5}}><strong style={{fontSize:34}}>{actionTotal}</strong><span style={{color:'var(--muted)'}}>{actionTotal?'poster behöver granskas eller följas upp.':'Inga poster kräver åtgärd just nu.'}</span></div></section>

    <div className="adminStats" style={{gridTemplateColumns:'repeat(auto-fit,minmax(120px,1fr))'}}>
      <div><b>{users}</b><span>Användare</span></div>
      <div><b>{bookings}</b><span>Bokningar</span></div>
      <div><b>{activeCases}</b><span>Aktiva ärenden</span></div>
      <div><b>{activeFlags}</b><span>Riskflaggor</span></div>
      <div><b>{restrictedUsers}</b><span>Begränsade/frysta</span></div>
      <div><b>{pendingReputation}</b><span>Historik att verifiera</span></div>
      <div><b>{pendingImports}</b><span>Importer i kö</span></div>
      <div><b>{heldPayouts}</b><span>Payout pending/hold</span></div>
    </div>

    <section style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(220px,1fr))',gap:12,margin:'20px 0'}}>
      <Link className="modeSwitchButton" href={`/${locale}/admin/sok`}>Global sök →</Link>
      <Link className="modeSwitchButton" href={`/${locale}/admin/arenden`}>Support, skador & tvister →</Link>
      <Link className="modeSwitchButton" href={`/${locale}/admin/risk`}>Risk & Trust/Safety →</Link>
      <Link className="modeSwitchButton" href={`/${locale}/admin/historik`}>Verifiera extern historik →</Link>
      <Link className="modeSwitchButton" href={`/${locale}/admin/importer`}>Hantera annonsimporter →</Link>
      <Link className="modeSwitchButton" href={`/${locale}/admin/ekonomi`}>Ekonomi & reconciliation →</Link>
      <Link className="modeSwitchButton" href={`/${locale}/admin/audit`}>Audit log →</Link>
    </section>

    <section style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(320px,1fr))',gap:18,margin:'24px 0'}}>
      <div className="adminQueue"><div className="adminEmpty" style={{textAlign:'left',fontWeight:850}}>Ärenden att hantera · {activeCases}</div>{actionCases.map((item:any)=><Link key={item.id} href={`/${locale}/admin/arenden/${item.id}`} className="adminCaseRow"><div className="adminStatus open"/><div><span>{item.case_type} · {new Date(item.created_at).toLocaleString('sv-SE')}</span><strong>{item.reason}</strong><small>{item.booking_id.slice(0,8).toUpperCase()} · {item.status}</small></div><b>Öppna</b><i>›</i></Link>)}{!actionCases.length?<div className="adminEmpty">Inga aktiva ärenden.</div>:null}<Link href={`/${locale}/admin/arenden`} className="adminCaseRow"><div/><div><strong>Visa alla ärenden</strong></div><b>{activeCases}</b><i>›</i></Link></div>

      <div className="adminQueue"><div className="adminEmpty" style={{textAlign:'left',fontWeight:850}}>Riskflaggor att hantera · {activeFlags}</div>{actionFlags.map((flag:any)=><Link key={flag.id} href={`/${locale}/admin/anvandare/${flag.user_id}`} className="adminCaseRow"><div className={`adminStatus ${flag.severity==='critical'||flag.severity==='high'?'rejected':'open'}`}/><div><span>{flag.severity.toUpperCase()} · {flag.status}</span><strong>{flag.reason}</strong><small>{new Date(flag.created_at).toLocaleString('sv-SE')}</small></div><b>Granska</b><i>›</i></Link>)}{!actionFlags.length?<div className="adminEmpty">Inga aktiva riskflaggor.</div>:null}<Link href={`/${locale}/admin/risk`} className="adminCaseRow"><div/><div><strong>Öppna riskkön</strong></div><b>{activeFlags}</b><i>›</i></Link></div>
    </section>

    <section className="adminQueue">
      <div className="adminEmpty" style={{textAlign:'left',fontWeight:850}}>Senaste bokningar</div>
      {recent.map((booking:any)=><Link key={booking.id} href={`/${locale}/bokningar/${booking.id}`} className="adminCaseRow"><div className={`adminStatus ${['completed'].includes(booking.status)?'resolved':['declined','cancelled','refunded'].includes(booking.status)?'rejected':'open'}`}/><div><span>{new Date(booking.created_at).toLocaleDateString('sv-SE')} · {booking.start_date}–{booking.end_date}</span><strong>{booking.id.slice(0,8).toUpperCase()}</strong><small>{Number(booking.total_price||0).toLocaleString('sv-SE')} kr</small></div><b>{booking.status}</b><i>›</i></Link>)}
      {!recent.length?<div className="adminEmpty">Inga bokningar ännu.</div>:null}
    </section>

    <p style={{color:'var(--muted)',fontSize:12,marginTop:16}}>Ledger: {payments} betalposter · {scheduledPayouts} schemalagda payouts. Pending payout kan innebära hold eller ännu ej schemalagd utbetalning i simulationsflödet.</p>
  </main>;
}
