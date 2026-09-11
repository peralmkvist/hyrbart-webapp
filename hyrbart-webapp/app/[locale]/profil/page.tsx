import Link from 'next/link';

export default async function ProfilePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const en = locale === 'en';
  return (
    <section className="ds2Page modePage">
      <header className="ds2Header"><h1>{en ? 'Profile' : 'Profil'}</h1></header>
      <div className="modeCard">
        <div className="modeAvatar">P</div>
        <div><h2>Per</h2><p>Danderyd, Sverige</p></div>
      </div>
      <Link className="modeSwitchButton" href={`/topsecret/${locale}/vard`}>
        {en ? 'Switch to host mode' : 'Växla till uthyrarläge'}
      </Link>
      <Link className="profileMenuLink" href={`/topsecret/${locale}/mer`}>{en ? 'Menu' : 'Meny'}</Link>
    </section>
  );
}
