import Link from 'next/link';

const MenuChevron = () => <span className="profileChevron" aria-hidden="true">›</span>;

export default async function ProfilePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const en = locale === 'en';
  const menu = en
    ? ['Account settings', 'Host settings', 'Get help', 'View profile', 'Terms', 'Privacy', 'Log out']
    : ['Kontoinställningar', 'Uthyrarinställningar', 'Få hjälp', 'Visa profil', 'Allmänna villkor', 'Sekretess', 'Logga ut'];

  return (
    <section className="ds2Page profileDashboard">
      <header className="ds2Header"><h1>{en ? 'Profile' : 'Profil'}</h1></header>

      <div className="profileIdentityCard">
        <div className="profileIdentityMain">
          <div className="profileAvatar">P</div>
          <div><h2>Per</h2><p>Danderyd, Sverige</p></div>
        </div>
        <div className="profileStats">
          <div><strong>12</strong><span>{en ? 'rentals' : 'hyror'}</span></div>
          <div><strong>8</strong><span>{en ? 'reviews' : 'omdömen'}</span></div>
          <div><strong>4,94</strong><span>{en ? 'average rating' : 'snittbetyg'}</span></div>
        </div>
      </div>

      <div className="profileInsightGrid">
        <div className="profileInsightCard">
          <h2>{en ? 'Expenses' : 'Utgifter'}</h2>
          <p>{en ? 'SEK 1,845 this month' : '1 845 kr den här månaden'}</p>
          <div className="profileBars" aria-hidden="true"><i/><i/><i/><i/><i/></div>
        </div>
        <div className="profileInsightCard">
          <h2>{en ? 'Insights' : 'Insikter'}</h2>
          <p>{en ? '8 reviews' : '8 omdömen'}</p>
          <div className="profileRating"><span>★</span><strong>4,94</strong></div>
        </div>
      </div>

      <Link className="modeSwitchButton profileModeSwitch" href={`/topsecret/${locale}/vard/profil`}>
        {en ? 'Switch to host mode' : 'Växla till uthyrarläge'}
      </Link>

      <div className="profileMenuList">
        {menu.map((label) => (
          <div className={`profileMenuRow ${label === 'Logga ut' || label === 'Log out' ? 'logout' : ''}`} key={label}>
            <span>{label}</span><MenuChevron />
          </div>
        ))}
      </div>
    </section>
  );
}
