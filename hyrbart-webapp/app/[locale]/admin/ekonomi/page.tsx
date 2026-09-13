import Link from 'next/link';
import { redirect } from 'next/navigation';
import { requireAdmin } from '@/lib/admin';
import { createAdminClient } from '@/lib/supabase/admin';

function money(value:unknown){return `${Number(value||0).toLocaleString('sv-SE')} kr`;}
function sum(rows:any[],key:string){return rows.reduce((total,row)=>total+Number(row?.[key]||0),0);}

export default async function AdminFinance({params,searchParams}:{params:Promise<{locale:string}>;searchParams:Promise<{view?:string;status?:string}>}){
  const {locale}=await params;
  const {view='issues',status='all'}=await searchParams;
  const user=await requireAdmin();
  if(!user)redirect(`/${locale}`);
  const admin=createAdminClient();
  const [{data:payments,error:paymentError},{data:payouts,error:payoutError},{data:bookings,error:bookingError}]=await Promise.all([
    admin.from('booking_payments').select('*').order('created_at',{ascending:false}).limit(250),
    admin.from('booking_payouts').select('*').order('created_at',{ascending:false}).limit(250),
    admin.from('bookings').select('id,status,total_price,rental_price,service_fee,currency,completed_at').order('created_at',{ascending:false}).limit(500),
  ]);
  if(paymentError)throw paymentError;if(payoutError)throw payoutError;if(bookingError)throw bookingError;

  const paymentRows=payments||[];
  const payoutRows=payouts||[];
  const bookingById=new Map((bookings||[]).map((booking:any)=>[booking.id,booking]));
  const paymentByBooking=new Map(paymentRows.map((payment:any)=>[payment.booking_id,payment]));

  const grossCaptured=sum(paymentRows.filter((row:any)=>['captured','partially_refunded','refunded'].includes(row.status)),'amount');
  const refunds=sum(paymentRows,'refund_amount');
  const netCaptured=grossCaptured-refunds;
  const serviceFees=sum(paymentRows,'service_fee');
  const scheduledPayouts=sum(payoutRows.filter((row:any)=>['scheduled','paid'].includes(row.status)),'amount');
  const heldPayouts=sum(payoutRows.filter((row:any)=>row.status==='pending'),'amount');

  const issues:any[]=[];
  for(const payment of paymentRows){
    const booking=bookingById.get(payment.booking_id) as any;
    if(!booking){issues.push({kind:'payment',bookingId:payment.booking_id,label:'Betalning saknar bokning',detail:`${payment.status} · ${money(payment.amount)}`});continue;}
    const expected=Number(booking.total_price||0);
    if(Math.abs(Number(payment.amount||0)-expected)>0.01)issues.push({kind:'payment',bookingId:payment.booking_id,label:'Betalningsbelopp avviker',detail:`ledger ${money(payment.amount)} · bokning ${money(expected)}`});
    if(Number(payment.refund_amount||0)>Number(payment.amount||0)+0.01)issues.push({kind:'payment',bookingId:payment.booking_id,label:'Återbetalning överstiger betalning',detail:`refund ${money(payment.refund_amount)} · betalning ${money(payment.amount)}`});
  }
  for(const payout of payoutRows){
    const booking=bookingById.get(payout.booking_id) as any;
    if(!booking){issues.push({kind:'payout',bookingId:payout.booking_id,label:'Payout saknar bokning',detail:`${payout.status} · ${money(payout.amount)}`});continue;}
    if(!paymentByBooking.has(payout.booking_id)&&!['cancelled'].includes(payout.status))issues.push({kind:'payout',bookingId:payout.booking_id,label:'Payout utan betalpost',detail:`${payout.status} · ${money(payout.amount)}`});
    const expected=Number(booking.rental_price||0);
    if(!['cancelled'].includes(payout.status)&&Math.abs(Number(payout.amount||0)-expected)>0.01)issues.push({kind:'payout',bookingId:payout.booking_id,label:'Payout-belopp avviker',detail:`ledger ${money(payout.amount)} · hyrespris ${money(expected)}`});
    if(payout.status==='pending')issues.push({kind:'payout',bookingId:payout.booking_id,label:'Payout är på hold/pending',detail:`${money(payout.amount)}${payout.due_at?` · due ${new Date(payout.due_at).toLocaleString('sv-SE')}`:''}`});
  }

  const statuses=(view==='payouts'?payoutRows:paymentRows).map((row:any)=>row.status).filter(Boolean);
  const availableStatuses=[...new Set(statuses)].sort();
  const visiblePayments=status==='all'?paymentRows:paymentRows.filter((row:any)=>row.status===status);
  const visiblePayouts=status==='all'?payoutRows:payoutRows.filter((row:any)=>row.status===status);
  const href=(nextView:string,nextStatus='all')=>`/${locale}/admin/ekonomi?view=${nextView}&status=${nextStatus}`;

  return <main className="adminPage">
    <header className="adminHeader"><div><span>HYRBART FINANCE</span><h1>Ekonomi & reconciliation</h1><p>Intern ledger för bokningstransaktioner. Provider “simulation” är testflöde och representerar inte riktiga banktransaktioner.</p><Link href={`/${locale}/admin`} style={{display:'inline-block',marginTop:10}}>← Adminöversikt</Link></div><div className="adminAvatar">H</div></header>

    <div className="adminStats" style={{gridTemplateColumns:'repeat(auto-fit,minmax(140px,1fr))'}}>
      <div><b>{money(grossCaptured)}</b><span>Brutto capture</span></div><div><b>{money(refunds)}</b><span>Återbetalt</span></div><div><b>{money(netCaptured)}</b><span>Netto capture</span></div><div><b>{money(serviceFees)}</b><span>Serviceavgifter</span></div><div><b>{money(scheduledPayouts)}</b><span>Payout scheduled/paid</span></div><div><b>{money(heldPayouts)}</b><span>Payout hold</span></div><div><b>{issues.length}</b><span>Avvikelser</span></div>
    </div>

    <section style={{display:'flex',gap:8,flexWrap:'wrap',margin:'18px 0'}}>
      <Link href={href('issues')} className="modeSwitchButton" style={{padding:'9px 13px',opacity:view==='issues'?1:.6}}>Avvikelser ({issues.length})</Link>
      <Link href={href('payments')} className="modeSwitchButton" style={{padding:'9px 13px',opacity:view==='payments'?1:.6}}>Betalningar ({paymentRows.length})</Link>
      <Link href={href('payouts')} className="modeSwitchButton" style={{padding:'9px 13px',opacity:view==='payouts'?1:.6}}>Utbetalningar ({payoutRows.length})</Link>
    </section>

    {view!=='issues'?<section style={{display:'flex',gap:8,flexWrap:'wrap',margin:'0 0 18px'}}><Link href={href(view,'all')} className="modeSwitchButton" style={{padding:'7px 11px',opacity:status==='all'?1:.6}}>Alla</Link>{availableStatuses.map(value=><Link key={value} href={href(view,value)} className="modeSwitchButton" style={{padding:'7px 11px',opacity:status===value?1:.6}}>{value}</Link>)}</section>:null}

    {view==='issues'?<section className="adminQueue">{issues.map((issue,index)=><Link key={`${issue.kind}-${issue.bookingId}-${index}`} href={`/${locale}/bokningar/${issue.bookingId}`} className="adminCaseRow"><div className="adminStatus rejected"/><div><span>{issue.kind==='payment'?'BETALNING':'PAYOUT'}</span><strong>{issue.label}</strong><small>{issue.detail}</small></div><b>{issue.bookingId.slice(0,8).toUpperCase()}</b><i>›</i></Link>)}{!issues.length?<div className="adminEmpty">Inga ledger-avvikelser hittades i de senaste posterna.</div>:null}</section>:null}

    {view==='payments'?<section className="adminQueue">{visiblePayments.map((payment:any)=><Link key={payment.id} href={`/${locale}/bokningar/${payment.booking_id}`} className="adminCaseRow"><div className={`adminStatus ${payment.status==='captured'?'resolved':payment.status.includes('refund')?'open':payment.status==='failed'?'rejected':'open'}`}/><div><span>{new Date(payment.created_at).toLocaleString('sv-SE')} · {payment.provider}</span><strong>{money(payment.amount)} · {payment.currency}</strong><small>{payment.status}{payment.refund_amount?` · återbetalt ${money(payment.refund_amount)}`:''}{payment.service_fee?` · avgift ${money(payment.service_fee)}`:''}</small></div><b>{payment.booking_id.slice(0,8).toUpperCase()}</b><i>›</i></Link>)}{!visiblePayments.length?<div className="adminEmpty">Inga betalposter matchar filtret.</div>:null}</section>:null}

    {view==='payouts'?<section className="adminQueue">{visiblePayouts.map((payout:any)=><Link key={payout.id} href={`/${locale}/bokningar/${payout.booking_id}`} className="adminCaseRow"><div className={`adminStatus ${payout.status==='paid'?'resolved':payout.status==='failed'?'rejected':payout.status==='pending'?'rejected':'open'}`}/><div><span>{new Date(payout.created_at).toLocaleString('sv-SE')} · {payout.provider}</span><strong>{money(payout.amount)} · {payout.currency}</strong><small>{payout.status}{payout.due_at?` · planerad ${new Date(payout.due_at).toLocaleString('sv-SE')}`:''}</small></div><b>{payout.booking_id.slice(0,8).toUpperCase()}</b><i>›</i></Link>)}{!visiblePayouts.length?<div className="adminEmpty">Inga utbetalningsposter matchar filtret.</div>:null}</section>:null}

    <p style={{color:'var(--muted)',fontSize:12,marginTop:16}}>Reconciliation körs över de senaste 250 ledger-posterna och 500 bokningarna. Den här vyn är diagnostik; ekonomiska beslut i tvister görs fortsatt via ärendeflödet.</p>
  </main>;
}
