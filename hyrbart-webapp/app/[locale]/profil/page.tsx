import Link from 'next/link';
import ProfileLanguageSetting from '@/components/ProfileLanguageSetting';
import { createClient } from '@/lib/supabase/server';

const MenuChevron = () => <span className="profileChevron" aria-hidden="true">›</span>;

type Profile = {
  display_name: string | null;
  city: string | null;
  avatar_url: string | null;
};

export default async function ProfilePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const en = locale === 'en';
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  let profile: Profile | null = null;

  if (user) {
    const { data } = await supabase
      .from('profiles')
      .select('display_name, city, avatar_url')
      .eq('id', user.id)
      .maybeSingle();
    profile = data;
  }

  const displayName = profile?.display_name || 'Per';
  const city = profile?.city || 'Danderyd';
  const initial = displayName.trim().charAt(0).toUpperCase() || 'P';
  const publicProfileHref = `/${locale}/profil/per`;
  const menu = en
    ? ['Account settings', 'Host settings', 'Get help', 'View profile', 'Terms', 'Privacy', 'Log out']
    : ['Kontoinställningar', 'Uthyrarinställningar', 'Få hjälp', 'Visa profil', 'Allmänna villkor', 'Sekretess', 'Logga ut'];

  return (
    <section className="ds2Page profileDashboard">
      <header className="ds2Header"><h1>{en ? 'Profile' : 'Profil'}</h1></header>
      <div className="profileIdentityCard">
        <Link
          href={publicProfileHref}
          className="profileIdentityMain"
          aria-label={en ? 'View your public profile' : 'Visa din profil'}
          style={{ color: 'inherit', textDecoration: 'none', cursor: 'pointer' }}
        >
          {profile?.avatar_url
            ? <img className="profileAvatar" src={profile.avatar_url} alt={displayName} style={{ objectFit: 'cover' }}/>
            : <div className="profileAvatar">{initial}</div>}
          <div><h2>{displayName}</h2><p>{city}, Sverige</p></div>
        </Link>
        <div className="profileStats"><div><strong>12</strong><span>{en ? 'rentals' : 'hyror'}</span></div><div><strong>8</strong><span>{en ? 'reviews' : 'omdömen'}</span></div><div><strong>4,94</strong><span>{en ? 'average rating' : 'snittbetyg'}</span></div></div>
      </div>
      <div className="profileInsightGrid"><div className="profileInsightCard"><h2>{en ? 'Expenses' : 'Utgifter'}</h2><p>{en ? 'SEK 1,845 this month' : '1 845 kr den här månaden'}</p><div className="profileBars" aria-hidden="true"><i/><i/><i/><i/><i/></div></div><div className="profileInsightCard"><h2>{en ? 'Insights' : 'Insikter'}</h2><p>{en ? '8 reviews' : '8 omdömen'}</p><div className="profileRating"><span>★</span><strong>4,94</strong></div></div></div>
      <Link className="modeSwitchButton profileModeSwitch" href={`/topsecret/${locale}/vard/profil`}>{en ? 'Switch to host mode' : 'Växla till uthyrarläge'}</Link>
      <div className="profileMenuList"><ProfileLanguageSetting locale={locale}/>{menu.map((label) => {
        const isViewProfile = label === 'Visa profil' || label === 'View profile';
        const row = <><span>{label}</span><MenuChevron /></>;
        return isViewProfile
          ? <Link className="profileMenuRow" href={publicProfileHref} key={label} style={{ color: 'inherit', textDecoration: 'none' }}>{row}</Link>
          : <div className={`profileMenuRow ${label === 'Logga ut' || label === 'Log out' ? 'logout' : ''}`} key={label}>{row}</div>;
      })}</div>
    </section>
  );
}
