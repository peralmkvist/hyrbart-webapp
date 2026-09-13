import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { requireAdmin } from '@/lib/admin';
import { createAdminClient } from '@/lib/supabase/admin';
import AdminUserOperations from '@/components/AdminUserOperations';

function bool(value:boolean|null|undefined){return value?'Ja':'Nej';}

export default async function AdminUserPage({params}:{params:Promise<{locale:string;id:string}>}){
  const {locale,id}=await params;
  const adminUser=await requireAdmin();
  if(!adminUser)redirect(`/${locale}`);
  const admin=createAdminClient();
  const [{data:profile,error:profileError},authResult,{data:bookings},{data:claims},{data:imports},{data:cases},{data:notes},{data:flags},{data:audit}]=await Promise.all([
    admin.from('profiles').select('*').eq('id',id).maybeSingle(),
    admin.auth.admin.getUserById(id),
    admin.from('bookings').select('id,status,start_date,end_date,total_price,product_id,owner_id,renter_id,created_at').or(`owner_id.eq.${id},renter_id.eq.${id}`).order('created_at',{ascending:false}).limit(100),
    admin.from('external_reputation_claims').select('id,source_platform,source_profile_url,status,verified_rating,verified_review_count,created_at').eq('user_id',id).order('created_at',{ascending:false}),
    admin.from('listing_import_jobs').select('id,source_platform,source_url,status,target_sanity_id,created_at').eq('user_id',id).order('created_at',{ascending:false}),
    admin.from('booking_cases').select('id,booking_id,status,case_type,reason,created_at').eq('opened_by',id).order('created_at',{ascending:false}),
    admin.from('admin_support_notes').select('id,note,created_at,admin_user_id').eq('user_id',id).order('created_at',{ascending:false}).limit(50),
    admin.from('risk_flags').select('*').eq('user_id',id).order('created_at',{ascending:false}).limit(50),
    admin.from('admin_audit_log').select('*').eq('entity_type','user').eq('entity_id',id).order('created_at',{ascending:false}).limit(100),
  ]);
  if(profileError||!profile)notFound();
  const authUser=authResult.data.user;
  const verified=Boolean(profile.bankid_verified||profile.identity_verification_status==='verified');
  const rows=bookings||[];
  const bookingIds=rows.map((b:any)=>b.id);
  const [{data:payments},{data:payouts}]=bookingIds.length?await Promise.all([
    admin.from('booking_payments').select('*').in('booking_id',bookingIds).order('created_at',{ascending:false}),
    admin.from('booking_payouts').select('*').in('booking_id',bookingIds).order('created_at',{ascending:false}),
  ]):[{data:[]},{data:[]}];
  const ownerCount=rows.filter((row:any)=>row.owner_id===id).length;
  const renterCount=rows.filter((row:any)=>row.renter_id===id).length;
  const captured=(payments||[]).reduce((sum:number,p:any)=>sum+(['captured','partially_refunded','refunded'].includes(p.status)?Number(p.amount||0):0),0);
  const refunded=(payments||[]).reduce((sum:number,p:any)=>sum+Number(p.refund_amount||0),0);
  const payoutTotal=(payouts||[]).filter((p:any)=>['scheduled','paid'].includes(p.status)).reduce((sum:number,p:any)=>sum+Number(p.amount||0),0);

  return <main className="adminPage">
    <header className="adminHeader"><div><span>HYRBART ADMIN · ANVÄNDARE</span><h1>{profile.display_name||[profile.first_name,profile.last_name].filter(Boolean).join(' ')||'Namnlös användare'}</h1><p>{authUser?.email||id}</p><Link href={`/${locale}/admin/sok?q=${encodeURIComponent(profile.display_name||authUser?.email||id)}`} style={{display:'inline-block',marginTop:10}}>← Till sök</Link></div><div className="adminAvatar">{String(profile.display_name||'?').slice(0,1).toUpperCase()}</div></header>

    <div className="adminStats" style={{gridTemplateColumns:'repeat(auto-fit,minmax(130px,1fr))'}}><div><b>{ownerCount}</b><span>Som uthyrare</span></div><div><b>{renterCount}</b><span>Som hyrare</span></div><div><b>{(cases||[]).length}</b><span>Öppnade ärenden</span></div><div><b>{(flags||[]).filter((f:any)=>['open','reviewing'].includes(f.status)).length}</b><span>Aktiva riskflaggor</span></div></div>

    <section style={card}><h2 style={heading}>Konto & verifiering</h2><Row label="Användar-id" value={id}/><Row label="E-post" value={authUser?.email||'—'}/><Row label="Ort" value={profile.city||'—'}/><Row label="Kontostatus" value={profile.account_status||'active'}/><Row label="Statusorsak" value={profile.account_status_reason||'—'}/><Row label="Skapad" value={profile.created_at?new Date(profile.created_at).toLocaleString('sv-SE'):'—'}/><Row label="Identitet verifierad" value={verified?'Ja':'Nej'}/><Row label="Verifieringsstatus" value={profile.identity_verification_status|| (profile.bankid_verified?'legacy_bankid':'unverified')}/><Row label="Verifieringsleverantör" value={profile.identity_verification_provider||'—'}/><Row label="Betalningsmetod redo" value={bool(profile.payment_method_ready)}/><Row label="Utbetalningskonto redo" value={bool(profile.payout_method_ready)}/><Row label="Sanity-profil" value={profile.sanity_profile_id||'—'}/></section>

    <AdminUserOperations userId={id} currentStatus={profile.account_status||'active'}/>

    <section style={card}><h2 style={heading}>Ekonomisk avstämning</h2><div className="adminStats" style={{gridTemplateColumns:'repeat(auto-fit,minmax(140px,1fr))'}}><div><b>{captured.toLocaleString('sv-SE')} kr</b><span>Registrerat betalt</span></div><div><b>{refunded.toLocaleString('sv-SE')} kr</b><span>Återbetalat</span></div><div><b>{payoutTotal.toLocaleString('sv-SE')} kr</b><span>Schemalagt/utbetalt</span></div></div><p style={{color:'var(--muted)',marginBottom:0}}>Beloppen kommer från Hyrbarts interna ledger. Så länge provider är simulation är detta inte bankavstämning.</p></section>

    <section style={card}><h2 style={heading}>Support & risk</h2><div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(280px,1fr))',gap:20}}><div><h3>Privata noteringar</h3>{(notes||[]).map((n:any)=><article key={n.id} style={timelineItem}><small>{new Date(n.created_at).toLocaleString('sv-SE')}</small><p>{n.note}</p></article>)}{!(notes||[]).length?<p>Inga noteringar.</p>:null}</div><div><h3>Riskflaggor</h3>{(flags||[]).map((f:any)=><article key={f.id} style={timelineItem}><strong>{f.severity.toUpperCase()} · {f.status}</strong><small style={{display:'block'}}>{new Date(f.created_at).toLocaleString('sv-SE')}</small><p>{f.reason}</p></article>)}{!(flags||[]).length?<p>Inga riskflaggor.</p>:null}</div></div></section>

    <section style={card}><h2 style={heading}>Adminhistorik</h2>{(audit||[]).map((a:any)=><article key={a.id} style={timelineItem}><strong>{a.action}</strong><small style={{display:'block'}}>{new Date(a.created_at).toLocaleString('sv-SE')}</small>{a.metadata&&Object.keys(a.metadata).length?<pre style={{whiteSpace:'pre-wrap',fontSize:12}}>{JSON.stringify(a.metadata,null,2)}</pre>:null}</article>)}{!(audit||[]).length?<p>Ingen adminhistorik.</p>:null}</section>

    <section style={{marginTop:24}}><h2>Bokningar</h2><div className="adminQueue">{rows.map((booking:any)=><Link key={booking.id} href={`/${locale}/bokningar/${booking.id}`} className="adminCaseRow"><div className={`adminStatus ${booking.status==='completed'?'resolved':['cancelled','declined','refunded'].includes(booking.status)?'rejected':'open'}`}/><div><span>{booking.owner_id===id?'Uthyrare':'Hyrare'} · {booking.start_date}–{booking.end_date}</span><strong>{booking.product_id}</strong><small>{booking.id} · {Number(booking.total_price||0).toLocaleString('sv-SE')} kr</small></div><b>{booking.status}</b><i>›</i></Link>)}{!rows.length?<div className="adminEmpty">Inga bokningar.</div>:null}</div></section>

    <section style={{marginTop:24}}><h2>Verifierad/insänd extern historik</h2><div className="adminQueue">{(claims||[]).map((claim:any)=><a key={claim.id} href={claim.source_profile_url} target="_blank" rel="noreferrer" className="adminCaseRow"><div className={`adminStatus ${claim.status==='verified'?'resolved':claim.status==='rejected'?'rejected':'open'}`}/><div><span>{claim.source_platform} · {new Date(claim.created_at).toLocaleDateString('sv-SE')}</span><strong>{claim.source_profile_url}</strong><small>{claim.verified_rating!=null?`★ ${claim.verified_rating} · ${claim.verified_review_count??0} omdömen`:''}</small></div><b>{claim.status}</b><i>↗</i></a>)}{!(claims||[]).length?<div className="adminEmpty">Ingen extern historik.</div>:null}</div></section>

    <section style={{marginTop:24}}><h2>Annonsimporter</h2><div className="adminQueue">{(imports||[]).map((job:any)=><a key={job.id} href={job.source_url} target="_blank" rel="noreferrer" className="adminCaseRow"><div className={`adminStatus ${job.status==='imported'?'resolved':job.status==='rejected'?'rejected':'open'}`}/><div><span>{job.source_platform} · {new Date(job.created_at).toLocaleDateString('sv-SE')}</span><strong>{job.source_url}</strong><small>{job.target_sanity_id||'Inget Hyrbart-utkast kopplat ännu'}</small></div><b>{job.status}</b><i>↗</i></a>)}{!(imports||[]).length?<div className="adminEmpty">Inga importer.</div>:null}</div></section>
  </main>;
}

function Row({label,value}:{label:string;value:string}){return <div style={{display:'grid',gridTemplateColumns:'minmax(160px,.8fr) 1.4fr',gap:14,padding:'10px 0',borderBottom:'1px solid var(--line)'}}><span style={{color:'var(--muted)'}}>{label}</span><strong style={{overflowWrap:'anywhere'}}>{value}</strong></div>;}
const card={background:'#fff',border:'1px solid var(--line)',borderRadius:20,padding:'18px 20px',marginTop:24} as const;
const heading={margin:'0 0 8px'} as const;
const timelineItem={borderTop:'1px solid var(--line)',padding:'12px 0'} as const;
