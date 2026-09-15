import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getAdminAccess } from '@/lib/admin';
import { createAdminClient } from '@/lib/supabase/admin';
import styles from './page.module.css';

const TRACKING_STARTED_AT = '2026-09-14T18:42:40.000Z';
const DAY_MS = 24 * 60 * 60 * 1000;

function n(value: unknown) { return Number(value || 0); }
function money(value: number) { return `${Math.round(value).toLocaleString('sv-SE')} kr`; }
function pct(part: number, total: number) { return total > 0 ? `${Math.round((part / total) * 100)} %` : '–'; }
function exactCount(query: PromiseLike<{ count: number | null; error: any }>) {
  return query.then(({ count, error }) => { if (error) throw error; return count || 0; });
}
function metric(label: string, value: string | number, hint?: string) {
  return <div className={styles.metric}>
    <b className={styles.metricValue}>{value}</b><span className={styles.metricLabel}>{label}</span>{hint?<small className={styles.metricHint}>{hint}</small>:null}
  </div>;
}

export default async function ProductOperationsDashboard({params,searchParams}:{params:Promise<{locale:string}>;searchParams:Promise<{days?:string}>}){
  const {locale}=await params;
  const {days:rawDays}=await searchParams;
  const access=await getAdminAccess('audit.read');
  if(!access)redirect(`/${locale}/admin-inloggning`);
  const days=[7,30,90].includes(Number(rawDays))?Number(rawDays):30;
  const now=Date.now();
  const windowStart=new Date(now-days*DAY_MS).toISOString();
  const coverageStart=new Date(Math.max(new Date(windowStart).getTime(),new Date(TRACKING_STARTED_AT).getTime())).toISOString();
  const admin=createAdminClient();

  const [
    activationCount,bookingEventCount,paymentEventCount,deviationCount,
    bookingDirectCount,activeCases,activeFlags,restrictedUsers,
    eventTransitionsResult,paymentRowsResult,payoutRowsResult,opsResult,bookingStatusesResult,
  ]=await Promise.all([
    exactCount(admin.from('critical_product_events').select('id',{count:'exact',head:true}).eq('event_name','activation_completed').gte('created_at',coverageStart)),
    exactCount(admin.from('critical_product_events').select('id',{count:'exact',head:true}).eq('event_name','booking_created').gte('created_at',coverageStart)),
    exactCount(admin.from('critical_product_events').select('id',{count:'exact',head:true}).eq('event_name','payment_captured').gte('created_at',coverageStart)),
    exactCount(admin.from('critical_product_events').select('id',{count:'exact',head:true}).eq('event_name','deviation_detected').gte('created_at',coverageStart)),
    exactCount(admin.from('bookings').select('id',{count:'exact',head:true}).gte('created_at',coverageStart)),
    exactCount(admin.from('booking_cases').select('id',{count:'exact',head:true}).in('status',['open','awaiting_other_party','under_review'])),
    exactCount(admin.from('risk_flags').select('id',{count:'exact',head:true}).in('status',['open','reviewing'])),
    exactCount(admin.from('profiles').select('id',{count:'exact',head:true}).in('account_status',['restricted','frozen'])),
    admin.from('critical_product_events').select('event_name,properties,created_at').eq('event_name','booking_status_changed').gte('created_at',coverageStart).limit(10000),
    admin.from('booking_payments').select('status,amount,service_fee,refund_amount,currency,created_at').gte('created_at',windowStart).limit(10000),
    admin.from('booking_payouts').select('status,amount,currency,created_at').gte('created_at',windowStart).limit(10000),
    admin.from('operational_events').select('severity,event_type,source,created_at,correlation_id').gte('created_at',windowStart).order('created_at',{ascending:false}).limit(12),
    admin.from('bookings').select('status').gte('created_at',windowStart).limit(10000),
  ]);

  for(const result of [eventTransitionsResult,paymentRowsResult,payoutRowsResult,opsResult,bookingStatusesResult]) if(result.error)throw result.error;

  const transitions=eventTransitionsResult.data||[];
  const transitionCount=(status:string)=>transitions.filter((row:any)=>row.properties?.new_status===status).length;
  const accepted=transitionCount('accepted');
  const paid=transitionCount('paid') || paymentEventCount;
  const active=transitionCount('active');
  const completed=transitionCount('completed');
  const declined=transitionCount('declined');

  const paymentRows=paymentRowsResult.data||[];
  const payoutRows=payoutRowsResult.data||[];
  const capturedAmount=paymentRows.filter((x:any)=>['captured','paid','succeeded'].includes(x.status)).reduce((sum:number,x:any)=>sum+n(x.amount),0);
  const serviceFees=paymentRows.filter((x:any)=>['captured','paid','succeeded'].includes(x.status)).reduce((sum:number,x:any)=>sum+n(x.service_fee),0);
  const refunds=paymentRows.reduce((sum:number,x:any)=>sum+n(x.refund_amount),0);
  const scheduledPayouts=payoutRows.filter((x:any)=>x.status==='scheduled').reduce((sum:number,x:any)=>sum+n(x.amount),0);
  const heldPayouts=payoutRows.filter((x:any)=>x.status==='pending').reduce((sum:number,x:any)=>sum+n(x.amount),0);

  const statusCounts=new Map<string,number>();
  for(const row of bookingStatusesResult.data||[])statusCounts.set(row.status,(statusCounts.get(row.status)||0)+1);
  const ops=opsResult.data||[];
  const criticalOps=ops.filter((x:any)=>x.severity==='critical').length;
  const errorOps=ops.filter((x:any)=>x.severity==='error').length;
  const warningOps=ops.filter((x:any)=>x.severity==='warning').length;
  const trackingConsistent=bookingEventCount===bookingDirectCount;

  const funnel=[
    {label:'Aktiverade konton',value:activationCount,rate:'Bas'},
    {label:'Bokningar skapade',value:bookingEventCount,rate:pct(bookingEventCount,activationCount)},
    {label:'Accepterade',value:accepted,rate:pct(accepted,bookingEventCount)},
    {label:'Betalda',value:paid,rate:pct(paid,accepted)},
    {label:'Aktiva',value:active,rate:pct(active,paid)},
    {label:'Slutförda',value:completed,rate:pct(completed,paid)},
  ];

  return <main className="adminPage">
    <header className="adminHeader"><div><span>HYRBART ADMIN</span><h1>Produkt & drift</h1><p>Funnel, support, risk, ekonomi och drift i samma operativa vy.</p></div></header>
    <p><Link href={`/${locale}/admin`}>← Till adminöversikten</Link></p>

    <section className={styles.links}>
      {[7,30,90].map(d=><Link key={d} className="modeSwitchButton" href={`/${locale}/admin/produkt-drift?days=${d}`} style={{fontWeight:days===d?950:700}}>{d} dagar</Link>)}
      <Link className="modeSwitchButton" href={`/${locale}/admin/drift`}>Drift & larm →</Link>
      <Link className="modeSwitchButton" href={`/${locale}/admin/ekonomi`}>Ekonomi →</Link>
    </section>

    <section className={`${styles.tracking} ${trackingConsistent?styles.trackingOk:styles.trackingWarning}`}>
      <strong>{trackingConsistent?'Trackingkontroll OK':'Trackingavvikelse'}</strong>
      <div className={styles.trackingCopy}>Sedan {new Date(coverageStart).toLocaleString('sv-SE')}: {bookingEventCount} `booking_created`-events mot {bookingDirectCount} nya bokningsrader.</div>
      {!trackingConsistent?<small>Undersök eventlagret innan funneln används för beslut.</small>:null}
    </section>

    <h2>Produkttratt</h2>
    <p className={styles.muted}>Eventbaserad funnel från SCRUM-84. Tracking startade {new Date(TRACKING_STARTED_AT).toLocaleString('sv-SE')}.</p>
    <section className={styles.funnel}>
      {funnel.map((item,index)=><div key={item.label} className={styles.funnelCard}><small className={styles.step}>Steg {index+1}</small><b className={styles.funnelValue}>{item.value}</b><strong>{item.label}</strong><small className={styles.rate}>{item.rate}{item.rate!=='Bas'?' från föregående steg':''}</small></div>)}
    </section>

    <h2>Bokningar</h2>
    <section className={styles.metrics145}>
      {Array.from(statusCounts.entries()).sort((a,b)=>b[1]-a[1]).map(([status,count])=>metric(status,count))}
      {!statusCounts.size?metric('Bokningar i perioden',0):null}
      {metric('Nekade övergångar',declined,'Eventbaserat')}
    </section>

    <h2>Support & risk</h2>
    <section className={styles.metrics180}>
      {metric('Aktiva supportärenden',activeCases)}
      {metric('Öppna riskflaggor',activeFlags)}
      {metric('Begränsade/frysta konton',restrictedUsers)}
      {metric('Avvikelser i perioden',deviationCount,'Från central observability')}
    </section>

    <h2>Ekonomi</h2>
    <section className={styles.metrics180}>
      {metric('Captures',money(capturedAmount))}
      {metric('Service fees',money(serviceFees))}
      {metric('Refunds',money(refunds))}
      {metric('Schemalagda payouts',money(scheduledPayouts))}
      {metric('Pending/hold payouts',money(heldPayouts))}
    </section>

    <h2>Drifthälsa</h2>
    <section className={styles.health}>
      {metric('Critical',criticalOps)}{metric('Errors',errorOps)}{metric('Warnings',warningOps)}
    </section>
    <section className="adminQueue">
      {(ops as any[]).map((event:any)=><div key={`${event.correlation_id}-${event.created_at}`} className={`adminCaseRow ${styles.caseRow}`}><div><span>{new Date(event.created_at).toLocaleString('sv-SE')} · {event.severity.toUpperCase()}</span><strong>{event.event_type}</strong><small>{event.source}</small></div><Link href={`/${locale}/admin/drift?correlation=${encodeURIComponent(event.correlation_id)}`}>Trace →</Link></div>)}
      {!ops.length?<div className="adminEmpty">Inga persistenta driftlarm i perioden.</div>:null}
    </section>

    <p className={styles.footnote}>Period: senaste {days} dagar. Funnelns första möjliga datapunkt begränsas av eventkontraktets starttid. Ekonomisiffror bygger på ledgerposter, inte beräknade annonspriser.</p>
  </main>;
}
