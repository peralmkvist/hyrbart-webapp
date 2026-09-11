import Link from 'next/link';

const MenuChevron = () => <span className="profileChevron" aria-hidden="true">›</span>;

export default async function HostProfilePage({ params }: { params: Promise<{ locale: string }> }) {
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
          <div><strong>35</strong><span>{en ? 'rentals' : 'uthyrningar'}</span></div>
          <div><strong>24</strong><span>{en ? 'reviews' : 'omdömen'}</span></div>
          <div><strong>4,96</strong><span>{en ? 'average rating' : 'snittbetyg'}</span></div>
        </div>
      </div>

      <div className="profileInsightGrid">
        <div className="profileInsightCard">
          <h2>{en ? 'Revenue' : 'Intäkter'}</h2>
          <p>{en ? 'SEK 7,294 this month' : '7 294 kr den här månaden'}</p>
          <div className="profileBars" aria-hidden="true"><i/><i/><i/><i/><i/></div>
        </div>
        <div className="profileInsightCard">
          <h2>{en ? 'Insights' : 'Insikter'}</h2>
          <p>{en ? '24 reviews' : '24 omdömen'}</p>
          <div className="profileRating"><span>★</span><strong>4,96</strong></div>
        </div>
      </div>

      <Link className="modeSwitchButton profileModeSwitch" href={`/topsecret/${locale}/profil`}>
        {en ? 'Switch to renter mode' : 'Växla till hyrarläge'}
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
