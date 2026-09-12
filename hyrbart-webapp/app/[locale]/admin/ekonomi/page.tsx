import Link from 'next/link';
import { redirect } from 'next/navigation';
import { requireAdmin } from '@/lib/admin';
import { createAdminClient } from '@/lib/supabase/admin';

function money(value:unknown){return `${Number(value||0).toLocaleString('sv-SE')} kr`;}

export default async function AdminFinance({params}:{params:Promise<{locale:string}>}){
  const {locale}=await params;
  const user=await requireAdmin();
  if(!user)redirect(`/${locale}`);
  const admin=createAdminClient();
  const [{data:payments},{data:payouts}]=await Promise.all([
    admin.from('booking_payments').select('*').order('created_at',{ascending:false}).limit(100),
    admin.from('booking_payouts').select('*').order('created_at',{ascending:false}).limit(100),
  ]);

  return <main className="adminPage">
    <header className="adminHeader"><div><span>HYRBART FINANCE</span><h1>Betalningar & utbetalningar</h1><p>Intern ledger för bokningstransaktioner. Poster med provider “simulation” representerar testflödet och är inte riktiga banktransaktioner.</p><Link href={`/${locale}/admin`} style={{display:'inline-block',marginTop:10}}>← Adminöversikt</Link></div><div className="adminAvatar">H</div></header>

    <h2>Betalningar</h2>
    <div className="adminQueue">{(payments||[]).map((payment:any)=><Link key={payment.id} href={`/${locale}/bokningar/${payment.booking_id}`} className="adminCaseRow"><div className={`adminStatus ${payment.status==='captured'?'resolved':payment.status.includes('refund')?'open':payment.status==='failed'?'rejected':'open'}`}/><div><span>{new Date(payment.created_at).toLocaleString('sv-SE')} · {payment.provider}</span><strong>{money(payment.amount)} · {payment.currency}</strong><small>{payment.status}{payment.refund_amount?` · återbetalt ${money(payment.refund_amount)}`:''}</small></div><b>{payment.booking_id.slice(0,8).toUpperCase()}</b><i>›</i></Link>)}{!(payments||[]).length?<div className="adminEmpty">Inga betalposter ännu.</div>:null}</div>

    <h2 style={{marginTop:28}}>Utbetalningar</h2>
    <div className="adminQueue">{(payouts||[]).map((payout:any)=><Link key={payout.id} href={`/${locale}/bokningar/${payout.booking_id}`} className="adminCaseRow"><div className={`adminStatus ${payout.status==='paid'?'resolved':payout.status==='failed'?'rejected':'open'}`}/><div><span>{new Date(payout.created_at).toLocaleString('sv-SE')} · {payout.provider}</span><strong>{money(payout.amount)} · {payout.currency}</strong><small>{payout.status}{payout.due_at?` · planerad ${new Date(payout.due_at).toLocaleString('sv-SE')}`:''}</small></div><b>{payout.booking_id.slice(0,8).toUpperCase()}</b><i>›</i></Link>)}{!(payouts||[]).length?<div className="adminEmpty">Inga utbetalningsposter ännu.</div>:null}</div>
  </main>;
}
