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

  const [users,bookings,activeCases,pendingReputation,pendingImports,payments,scheduledPayouts,recentResult]=await Promise.all([
    exactCount(admin.from('profiles').select('id',{count:'exact',head:true})),
    exactCount(admin.from('bookings').select('id',{count:'exact',head:true})),
    exactCount(admin.from('booking_cases').select('id',{count:'exact',head:true}).in('status',['open','under_review'])),
    exactCount(admin.from('external_reputation_claims').select('id',{count:'exact',head:true}).eq('status','pending')),
    exactCount(admin.from('listing_import_jobs').select('id',{count:'exact',head:true}).in('status',['pending','processing','needs_review','ready'])),
    exactCount(admin.from('booking_payments').select('id',{count:'exact',head:true})),
    exactCount(admin.from('booking_payouts').select('id',{count:'exact',head:true}).eq('status','scheduled')),
    admin.from('bookings').select('id,status,start_date,end_date,total_price,created_at').order('created_at',{ascending:false}).limit(8),
  ]);
  const recent=recentResult.data||[];

  return <main className="adminPage">
    <header className="adminHeader"><div><span>HYRBART ADMIN</span><h1>Översikt</h1><p>Drift, trygghet och marknadsplatsflöden.</p></div><div className="adminAvatar">H</div></header>

    <div className="adminStats" style={{gridTemplateColumns:'repeat(auto-fit,minmax(120px,1fr))'}}>
      <div><b>{users}</b><span>Användare</span></div>
      <div><b>{bookings}</b><span>Bokningar</span></div>
      <div><b>{activeCases}</b><span>Aktiva ärenden</span></div>
      <div><b>{pendingReputation}</b><span>Historik att verifiera</span></div>
      <div><b>{pendingImports}</b><span>Importer i kö</span></div>
      <div><b>{payments}</b><span>Betalposter</span></div>
      <div><b>{scheduledPayouts}</b><span>Payouts väntar</span></div>
    </div>

    <section style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(220px,1fr))',gap:12,margin:'20px 0'}}>
      <Link className="modeSwitchButton" href={`/${locale}/admin/arenden`}>Support, skador & tvister →</Link>
      <Link className="modeSwitchButton" href={`/${locale}/admin/historik`}>Verifiera extern historik →</Link>
      <Link className="modeSwitchButton" href={`/${locale}/admin/importer`}>Hantera annonsimporter →</Link>
    </section>

    <section className="adminQueue">
      <div className="adminEmpty" style={{textAlign:'left',fontWeight:850}}>Senaste bokningar</div>
      {recent.map((booking:any)=><Link key={booking.id} href={`/${locale}/bokningar/${booking.id}`} className="adminCaseRow"><div className={`adminStatus ${['completed'].includes(booking.status)?'resolved':['declined','cancelled','refunded'].includes(booking.status)?'rejected':'open'}`}/><div><span>{new Date(booking.created_at).toLocaleDateString('sv-SE')} · {booking.start_date}–{booking.end_date}</span><strong>{booking.id.slice(0,8).toUpperCase()}</strong><small>{Number(booking.total_price||0).toLocaleString('sv-SE')} kr</small></div><b>{booking.status}</b><i>›</i></Link>)}
      {!recent.length?<div className="adminEmpty">Inga bokningar ännu.</div>:null}
    </section>
  </main>;
}
