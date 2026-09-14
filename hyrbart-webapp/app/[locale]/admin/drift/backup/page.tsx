import Link from 'next/link';
import {redirect} from 'next/navigation';
import {getAdminAccess} from '@/lib/admin';

const rows=[
  ['profiles','6','6','Ja','Ja'],
  ['bookings','1','1','Ja','Ja'],
  ['booking_messages','3','3','Ja','Ja'],
];

export default async function BackupRestorePage({params}:{params:Promise<{locale:string}>}){
  const {locale}=await params;
  const access=await getAdminAccess('audit.read');
  if(!access)redirect(`/${locale}/admin-inloggning`);
  return <main className="adminPage">
    <header className="adminHeader"><div><span>HYRBART OPERATIONS</span><h1>Backup & återställning</h1><p>Restore-runbook och senaste verifierade återställningstest.</p></div></header>
    <p><Link href={`/${locale}/admin/drift`}>← Drift & larm</Link></p>

    <section style={{padding:18,border:'1px solid var(--line)',borderRadius:18,margin:'18px 0'}}>
      <h2>Nuvarande backupnivå</h2>
      <p>Supabase kör Free-plan. Managed nedladdningsbara backups finns därför inte som produktionsskydd idag. Före extern launch ska Hyrbart minst ha managed daily backups samt separat backup av Storage-objekt. PITR rekommenderas om beslutad RPO kräver det.</p>
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(180px,1fr))',gap:10}}>
        <div><strong>Beta-RPO</strong><p>≤ 24 timmar</p></div>
        <div><strong>Beta-RTO</strong><p>≤ 4 timmar</p></div>
        <div><strong>Launch-mål RPO</strong><p>≤ 2 timmar</p></div>
        <div><strong>Launch-mål RTO</strong><p>≤ 2 timmar</p></div>
      </div>
    </section>

    <section style={{padding:18,border:'1px solid var(--line)',borderRadius:18,margin:'18px 0'}}>
      <h2>Restore-test · 14 september 2026</h2>
      <p>PASS. Testet kördes i en transaktion med temporära tabeller: snapshot → simulerad dataförlust → restore → count/checksum → rollback. Produktionsrader ändrades inte.</p>
      <div style={{overflowX:'auto'}}><table style={{width:'100%',borderCollapse:'collapse'}}><thead><tr>{['Tabell','Före','Återställda','Antal','Checksumma'].map(h=><th key={h} style={{textAlign:'left',padding:8,borderBottom:'1px solid var(--line)'}}>{h}</th>)}</tr></thead><tbody>{rows.map(r=><tr key={r[0]}>{r.map((v,i)=><td key={i} style={{padding:8,borderBottom:'1px solid var(--line)'}}>{v}</td>)}</tr>)}</tbody></table></div>
    </section>

    <section style={{padding:18,border:'1px solid var(--line)',borderRadius:18,margin:'18px 0'}}>
      <h2>Restoreordning</h2>
      <ol><li>Stoppa relevanta writes och utse Incident Commander.</li><li>Bevara bevis och ta snapshot av nuläget.</li><li>Bestäm minsta säkra restore-scope och välj senaste betrodda restorepunkt.</li><li>Återställ isolerat först när det är möjligt.</li><li>Verifiera counts/checksums, auth, booking-state, ledger och avtal.</li><li>Verifiera Storage separat — database backup återställer inte raderade filer.</li><li>Reconcile externa system, särskilt betalningar/payouts.</li><li>Kör healthcheck och kontrollerade smoke tests.</li><li>Incident Commander godkänner återöppning.</li></ol>
    </section>

    <section style={{padding:18,border:'1px solid var(--line)',borderRadius:18,margin:'18px 0'}}><h2>Kvar före launch</h2><ul><li>Managed backup-plan på betald Supabase.</li><li>Beslut om PITR utifrån RPO och kostnad.</li><li>Storage backup/restore för privata bilagor och bevisbilder.</li><li>Schemalagd off-Supabase logical export.</li><li>Restore-test i isolerad databas/projekt och namngiven backupägare.</li></ul></section>
  </main>;
}
