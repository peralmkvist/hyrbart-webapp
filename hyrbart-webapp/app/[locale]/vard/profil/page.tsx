import Link from 'next/link';
import { redirect } from 'next/navigation';
import ExternalHistoryModalSetting from '@/components/ExternalHistoryModalSetting';
import ProfileLanguageSetting from '@/components/ProfileLanguageSetting';
import PushNotificationsSetting from '@/components/PushNotificationsSetting';
import { createClient } from '@/lib/supabase/server';
import { formatProfileTenure } from '@/lib/profile-tenure';
import '../../profil/profile-menu.css';

const MenuChevron = () => <span className="profileChevron" aria-hidden="true">›</span>;

type MenuIconName = 'account' | 'host' | 'help' | 'profile' | 'terms' | 'privacy' | 'logout';

const MenuIcon = ({ name }: { name: MenuIconName }) => {
  const common = { width:24,height:24,viewBox:'0 0 24 24',fill:'none',stroke:'currentColor',strokeWidth:2,strokeLinecap:'round' as const,strokeLinejoin:'round' as const,'aria-hidden':true };
  if (name === 'account') return <svg {...common}><circle cx="12" cy="8" r="4"/><path d="M4.5 21a7.5 7.5 0 0 1 15 0"/></svg>;
  if (name === 'host') return <svg {...common}><path d="M4 6h10"/><path d="M18 6h2"/><circle cx="16" cy="6" r="2"/><path d="M4 12h2"/><path d="M10 12h10"/><circle cx="8" cy="12" r="2"/><path d="M4 18h8"/><path d="M16 18h4"/><circle cx="14" cy="18" r="2"/></svg>;
  if (name === 'help') return <svg {...common}><circle cx="12" cy="12" r="9"/><path d="M9.8 9a2.5 2.5 0 1 1 4.4 1.6c-.9.9-2.2 1.3-2.2 2.9"/><path d="M12 17h.01"/></svg>;
  if (name === 'profile') return <svg {...common}><circle cx="12" cy="8" r="3.5"/><path d="M5 20c.8-4 3.2-6 7-6s6.2 2 7 6"/></svg>;
  if (name === 'terms') return <svg {...common}><path d="M6 3h9l3 3v15H6z"/><path d="M14 3v4h4"/><path d="M9 12h6"/><path d="M9 16h6"/></svg>;
  if (name === 'privacy') return <svg {...common}><path d="M12 3 5 6v5c0 4.8 2.8 8.1 7 10 4.2-1.9 7-5.2 7-10V6z"/><path d="m9.5 12 1.7 1.7 3.5-3.7"/></svg>;
  return <svg {...common}><path d="M10 5H5v14h5"/><path d="M13 8l4 4-4 4"/><path d="M17 12H9"/></svg>;
};

type Profile = {
  display_name: string | null;
  city: string | null;
  avatar_url: string | null;
  sanity_profile_id: string | null;
};

async function getFirstPublishedListingDate(sanityProfileId?: string | null) {
  if (!sanityProfileId) return null;
  const projectId = 'djps09z6';
  const dataset = 'production';
  const apiVersion = '2026-09-08';
  const owner = JSON.stringify(sanityProfileId);
  const query = `*[_type=="product"&&owner._ref==${owner}&&(coalesce(listingStatus,"active") in ["active","paused","deleted"]) ]|order(_createdAt asc)[0]._createdAt`;
  const url = `https://${projectId}.api.sanity.io/v${apiVersion}/data/query/${dataset}?query=${encodeURIComponent(query)}`;
  try {
    const response = await fetch(url, { cache: 'no-store' });
    if (!response.ok) return null;
    const data = await response.json() as { result?: string | null };
    return data.result || null;
  } catch {
    return null;
  }
}

export default async function HostProfilePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const en = locale === 'en';
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/topsecret/${locale}/logga-in?next=${encodeURIComponent(`/topsecret/${locale}/vard/profil`)}`);

  const { data: profile } = await supabase
    .from('profiles')
    .select('display_name, city, avatar_url, sanity_profile_id')
    .eq('id', user.id)
    .maybeSingle() as { data: Profile | null };

  async function signOut() {
    'use server';
    const supabase = await createClient();
    await supabase.auth.signOut();
    redirect(`/topsecret/${locale}/logga-in`);
  }

  const firstPublishedAt = await getFirstPublishedListingDate(profile?.sanity_profile_id);
  const hostTenure = formatProfileTenure(firstPublishedAt, locale);
  const displayName = profile?.display_name || 'Per';
  const city = profile?.city || 'Danderyd';
  const initial = displayName.trim().charAt(0).toUpperCase() || 'P';
  const publicProfileHref = `/${locale}/profil/per`;
  const row = (label:string, icon:MenuIconName) => <><span className="profileMenuIcon"><MenuIcon name={icon}/></span><span className="profileMenuLabel">{label}</span><MenuChevron /></>;

  return (
    <section className="ds2Page profileDashboard">
      <header className="ds2Header"><h1>{en ? 'Profile' : 'Profil'}</h1></header>
      <div className="profileIdentityCard">
        <Link href={publicProfileHref} className="profileIdentityMain" aria-label={en ? 'View your public profile' : 'Visa din profil'} style={{ color:'inherit', textDecoration:'none' }}>
          {profile?.avatar_url
            ? <img className="profileAvatar" src={profile.avatar_url} alt={displayName} style={{ objectFit:'cover' }}/>
            : <div className="profileAvatar">{initial}</div>}
          <div><h2>{displayName}</h2><p>{city}, Sverige</p></div>
        </Link>
        <div className="profileStats"><div><strong>{hostTenure}</strong><span>{en ? 'Time as host' : 'Tid som uthyrare'}</span></div><div><strong>24</strong><span>{en ? 'reviews' : 'omdömen'}</span></div><div><strong>4,96</strong><span>{en ? 'average rating' : 'snittbetyg'}</span></div></div>
      </div>
      <div className="profileInsightGrid"><div className="profileInsightCard"><h2>{en ? 'Revenue' : 'Intäkter'}</h2><p>{en ? 'SEK 7,294 this month' : '7 294 kr den här månaden'}</p><div className="profileBars" aria-hidden="true"><i/><i/><i/><i/><i/></div></div><div className="profileInsightCard"><h2>{en ? 'Insights' : 'Insikter'}</h2><p>{en ? '24 reviews' : '24 omdömen'}</p><div className="profileRating"><span>★</span><strong>4,96</strong></div></div></div>
      <Link className="modeSwitchButton profileModeSwitch" href={`/topsecret/${locale}`}>{en ? 'Switch to renter mode' : 'Växla till hyrarläge'}</Link>

      <div className="profileMenuSection">
        <span className="profileMenuSectionLabel">{en ? 'SETTINGS' : 'INSTÄLLNINGAR'}</span>
        <div className="profileMenuList">
          <Link className="profileMenuRow" href={`/topsecret/${locale}/vard/profil/konto?back=vard`}>{row(en ? 'Account settings' : 'Kontoinställningar','account')}</Link>
          <Link className="profileMenuRow" href={`/topsecret/${locale}/vard/installningar`}>{row(en ? 'Host settings' : 'Uthyrarinställningar','host')}</Link>
          <ExternalHistoryModalSetting locale={locale}/>
          <PushNotificationsSetting locale={locale}/>
          <ProfileLanguageSetting locale={locale}/>
        </div>
      </div>

      <div className="profileMenuSection">
        <span className="profileMenuSectionLabel">{en ? 'HELP & LEGAL' : 'HJÄLP & JURIDIK'}</span>
        <div className="profileMenuList">
          <Link className="profileMenuRow" href={`/topsecret/${locale}/vard/profil/hjalp?back=vard`}>{row(en ? 'Get help' : 'Få hjälp','help')}</Link>
          <Link className="profileMenuRow" href={publicProfileHref}>{row(en ? 'View profile' : 'Visa profil','profile')}</Link>
          <Link className="profileMenuRow" href={`/topsecret/${locale}/vard/profil/villkor`}>{row(en ? 'Terms' : 'Allmänna villkor','terms')}</Link>
          <Link className="profileMenuRow" href={`/topsecret/${locale}/vard/profil/sekretess?back=vard`}>{row(en ? 'Privacy' : 'Sekretess','privacy')}</Link>
        </div>
      </div>

      <div className="profileMenuSection profileLogoutSection">
        <form action={signOut} style={{ margin: 0 }}><button type="submit" className="profileMenuRow profileMenuButton logout">{row(en ? 'Log out' : 'Logga ut','logout')}</button></form>
      </div>
    </section>
  );
}
