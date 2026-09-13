import Link from 'next/link';

export default async function HostMenuPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const en = locale === 'en';
  return (
    <section className="ds2Page modePage">
      <header className="ds2Header"><h1>{en ? 'Menu' : 'Meny'}</h1></header>
      <Link className="modeSwitchButton" href={`/topsecret/${locale}`}>
        {en ? 'Switch to renter mode' : 'Växla till hyrarläge'}
      </Link>
      <div className="moreAccordion">
        <details open><summary><span>{en ? 'Host tools' : 'Uthyrarverktyg'}</span></summary><div className="moreAccordionBody" style={{display:'grid',gap:10}}>
          <Link href={`/topsecret/${locale}/vard/importera`}>{en?'Import existing listings':'Importera befintliga annonser'} →</Link>
          <Link href={`/topsecret/${locale}/vard/onboarding/utbetalning`}>{en?'Payout account':'Utbetalningskonto'} →</Link>
        </div></details>
        <details><summary><span>{en ? 'Account settings' : 'Kontoinställningar'}</span></summary><div className="moreAccordionBody"><p>{en ? 'Account settings will be collected here.' : 'Kontoinställningar kommer att samlas här.'}</p></div></details>
        <details><summary><span>{en ? 'Help' : 'Hjälp'}</span></summary><div className="moreAccordionBody"><p>{en ? 'Host help and support.' : 'Hjälp och support för uthyrning.'}</p></div></details>
      </div>
    </section>
  );
}
