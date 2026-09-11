import Link from 'next/link';

export default async function HostProfilePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const en = locale === 'en';

  return (
    <section className="ds2Page modePage">
      <header className="ds2Header"><h1>{en ? 'Profile' : 'Profil'}</h1></header>
      <div className="modeCard">
        <div className="modeAvatar">P</div>
        <div><h2>Per</h2><p>Danderyd, Sverige</p></div>
      </div>
      <Link className="modeSwitchButton" href={`/topsecret/${locale}`}>
        {en ? 'Switch to renter mode' : 'Växla till hyrarläge'}
      </Link>
      <div className="moreAccordion">
        <details><summary><span>{en ? 'Account settings' : 'Kontoinställningar'}</span></summary><div className="moreAccordionBody"><p>{en ? 'Account settings will be collected here.' : 'Kontoinställningar kommer att samlas här.'}</p></div></details>
        <details><summary><span>{en ? 'Host settings' : 'Uthyrarinställningar'}</span></summary><div className="moreAccordionBody"><p>{en ? 'Settings for your listings and hosting will be collected here.' : 'Inställningar för dina annonser och din uthyrning kommer att samlas här.'}</p></div></details>
        <details><summary><span>{en ? 'Help & support' : 'Hjälp & support'}</span></summary><div className="moreAccordionBody"><p>{en ? 'Help and support for hosting.' : 'Hjälp och support för uthyrning.'}</p></div></details>
      </div>
    </section>
  );
}
