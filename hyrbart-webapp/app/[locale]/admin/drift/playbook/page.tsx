import Link from 'next/link';
import {redirect} from 'next/navigation';
import {getAdminAccess} from '@/lib/admin';

const severities=[
  ['SEV-1','Kritisk','Pågående risk för omfattande ekonomisk skada, dataläckage, kontoövertagande, fysisk personrisk eller total påverkan på ett kritiskt flöde. Stoppa skada först.'],
  ['SEV-2','Hög','Betydande påverkan på flera användare eller ett kritiskt flöde utan omedelbar omfattande person-/data-/pengarisk.'],
  ['SEV-3','Medel','Begränsat fel med workaround eller enskild bokning/användare. Support/Operations äger.'],
  ['SEV-4','Låg','Kosmetiskt fel, informationsfråga eller begränsad avvikelse utan affärs-/säkerhetspåverkan.'],
] as const;

const runbooks=[
  {title:'Payment / payout',owner:'Operations + Finance',steps:['Stoppa payout/capture om fortsatt ekonomisk skada kan uppstå.','Samla booking-, payment-/payout- och correlation-id.','Gör ingen manuell refund innan providerstatus verifierats.','Reconcile intern ledger mot provider innan återöppning.']},
  {title:'Data / integritet',owner:'Operations + Product/Privacy',steps:['Isolera endpoint/funktion vid aktiv obehörig åtkomst.','Bevara audit, operational events och request-id.','Verifiera RLS/grants och server-side authorization separat.','Korrigera/restore först när omfattning och betrodd datapunkt är känd.']},
  {title:'Trust & Safety',owner:'Trust & Safety + Operations',steps:['Vid omedelbar fara: hänvisa till 112/polis.','Bevara meddelanden, condition evidence och auditlogg.','Begränsa konto och stoppa payout vid tydlig fortsatt risk.','Dela inte privat kontakt-/positionsdata utan rättslig grund.']},
  {title:'Auth / admin',owner:'Security + Operations',steps:['Spärra adminkonto och återkalla sessioner.','Kontrollera admin_login_events och admin_audit_log.','Kontrollera roll-, payout-, risk- och exportåtgärder i incidentfönstret.','Rotera hemligheter endast vid konkret exponeringsrisk.']},
  {title:'Booking / automation',owner:'Operations + Engineering',steps:['Stoppa automation vid felaktiga massövergångar.','Jämför booking state, booking_events, ledger och pickup/return-events.','Ändra inte status manuellt utan full spårbarhet.','Testa både tillåten och nekad transition efter fix.']},
  {title:'Plattform / databas',owner:'Operations + Engineering',steps:['Kontrollera /api/health och senaste READY deployment.','Undvik muterande retries om idempotency inte är verifierad.','Kontrollera migrationshistorik/RLS innan rollback eller restore.','Verifiera health + representativt användarflöde före stängning.']},
];

export default async function IncidentPlaybookPage({params}:{params:Promise<{locale:string}>}){
  const {locale}=await params;
  const access=await getAdminAccess('audit.read');
  if(!access)redirect(`/${locale}/admin-inloggning`);
  return <main className="adminPage">
    <header className="adminHeader"><div><span>HYRBART OPERATIONS</span><h1>Incident- & supportplaybook</h1><p>Vem som agerar, vad som stoppas först och hur ett incidentförlopp verifieras innan återöppning.</p></div></header>
    <p><Link href={`/${locale}/admin/drift`}>← Drift & larm</Link></p>

    <section style={{border:'1px solid var(--line)',borderRadius:18,padding:18,margin:'18px 0',background:'#fff'}}>
      <h2 style={{marginTop:0}}>När något händer</h2>
      <ol style={{lineHeight:1.7,paddingLeft:22}}><li>Klassificera SEV-nivå och starttid.</li><li>Skapa incident-id <code>INC-YYYYMMDD-NNN</code> och koppla correlation-id.</li><li>Stoppa fortsatt skada före djup felsökning.</li><li>Bevara audit/loggar/evidence.</li><li>Utse en Incident Commander.</li><li>Kommunicera endast verifierade fakta.</li><li>Återställ kontrollerat och verifiera representativt flöde.</li><li>Reconcile data/pengar och dokumentera efterarbete.</li></ol>
    </section>

    <h2>Severity</h2>
    <section style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(230px,1fr))',gap:12}}>{severities.map(([code,name,text])=><article key={code} style={{border:'1px solid var(--line)',borderRadius:16,padding:16,background:'#fff'}}><strong style={{fontSize:20}}>{code} · {name}</strong><p style={{color:'var(--muted)',lineHeight:1.5}}>{text}</p></article>)}</section>

    <h2 style={{marginTop:28}}>Runbooks</h2>
    <section style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(300px,1fr))',gap:14}}>{runbooks.map(r=><article key={r.title} style={{border:'1px solid var(--line)',borderRadius:16,padding:18,background:'#fff'}}><h3 style={{marginTop:0}}>{r.title}</h3><p><strong>Ägare:</strong> {r.owner}</p><ol style={{paddingLeft:20,lineHeight:1.6}}>{r.steps.map(s=><li key={s}>{s}</li>)}</ol></article>)}</section>

    <section style={{border:'1px solid var(--line)',borderRadius:18,padding:18,margin:'28px 0',background:'#f7ffd9'}}><h2 style={{marginTop:0}}>Tabletop verifierad 14 sep 2026</h2><p><strong>Payment:</strong> okänd capture + schemalagd payout → stoppa payout, reconcile provider/ledger, återöppna först när status stämmer.</p><p><strong>Data:</strong> möjlig obehörig åtkomst till bokningsbilaga → isolera, bevara spår, verifiera auth/RLS/signed URL, bedöm privacy/legal.</p><p><strong>Safety:</strong> hot vid återlämning → fysisk säkerhet först, 112/polis vid akut fara, Trust & Safety äger, payout/konto kan stoppas och evidence bevaras.</p></section>

    <p style={{color:'var(--muted)',fontSize:13}}>Fullständigt versionslagt launch-underlag: <code>docs/incident-support-playbook.md</code>. Backup/restore hanteras separat i SCRUM-87.</p>
  </main>;
}
