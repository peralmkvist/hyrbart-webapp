import Link from 'next/link';
import { redirect } from 'next/navigation';
import ExternalHistoryModalSetting from '@/components/ExternalHistoryModalSetting';
import ProfileLanguageSetting from '@/components/ProfileLanguageSetting';
import PushNotificationsSetting from '@/components/PushNotificationsSetting';
import HostRevenueGoal from '@/components/HostRevenueGoal';
import { createClient } from '@/lib/supabase/server';
import { getUserReviewSummary } from '@/lib/review-summaries';
import { formatProfileTenure } from '@/lib/profile-tenure';
import { calculateEstimatedHostRevenue, countCompletedRentals, setupProgress } from '@/lib/host-profile-insights';
import '../../profil/profile-menu.css';

const MenuChevron = () => <span className="profileChevron" aria-hidden="true">›</span>;
type MenuIconName = 'account' | 'host' | 'notifications' | 'referral' | 'help' | 'profile' | 'terms' | 'privacy' | 'logout';
const MenuIcon = ({ name }: { name: MenuIconName }) => {
  const common = { width:24,height:24,viewBox:'0 0 24 24',fill:'none',stroke:'currentColor',strokeWidth:2,strokeLinecap:'round' as const,strokeLinejoin:'round' as const,'aria-hidden':true };
  if (name === 'account') return <svg {...common}><circle cx="12" cy="8" r="4"/><path d="M4.5 21a7.5 7.5 0 0 1 15 0"/></svg>;
  if (name === 'host') return <svg {...common}><path d="M4 6h10"/><path d="M18 6h2"/><circle cx="16" cy="6" r="2"/><path d="M4 12h2"/><path d="M10 12h10"/><circle cx="8" cy="12" r="2"/><path d="M4 18h8"/><path d="M16 18h4"/><circle cx="14" cy="18" r="2"/></svg>;
  if (name === 'notifications') return <svg {...common}><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"/><path d="M10 21h4"/></svg>;
  if (name === 'referral') return <svg {...common}><circle cx="9" cy="8" r="3"/><circle cx="17" cy="10" r="2.5"/><path d="M3.5 20c.6-4 2.4-6 5.5-6s4.9 2 5.5 6"/><path d="M14.5 15.5c2.9-.4 4.8 1 5.5 4.5"/><path d="M18 3v4M16 5h4"/></svg>;
  if (name === 'help') return <svg {...common}><circle cx="12" cy="12" r="9"/><path d="M9.8 9a2.5 2.5 0 1 1 4.4 1.6c-.9.9-2.2 1.3-2.2 2.9"/><path d="M12 17h.01"/></svg>;
  if (name === 'profile') return <svg {...common}><circle cx="12" cy="8" r="3.5"/><path d="M5 20c.8-4 3.2-6 7-6s6.2 2 7 6"/></svg>;
  if (name === 'terms') return <svg {...common}><path d="M6 3h9l3 3v15H6z"/><path d="M14 3v4h4"/><path d="M9 12h6"/><path d="M9 16h6"/></svg>;
  if (name === 'privacy') return <svg {...common}><path d="M12 3 5 6v5c0 4.8 2.8 8.1 7 10 4.2-1.9 7-5.2 7-10V6z"/><path d="m9.5 12 1.7 1.7 3.5-3.7"/></svg>;
  return <svg {...common}><path d="M10 5H5v14h5"/><path d="M13 8l4 4-4 4"/><path d="M17 12H9"/></svg>;
};

type Profile = { display_name:string|null; city:string|null; avatar_url:string|null; sanity_profile_id:string|null; bankid_verified:boolean|null; identity_verification_status:string|null; payout_method_ready:boolean|null; payout_provider_account_id:string|null };

async function getListingFacts(sanityProfileId?:string|null){
  if(!sanityProfileId)return {count:0,firstPublishedAt:null as string|null};
  const projectId='djps09z6',dataset='production',apiVersion='2026-09-08',owner=JSON.stringify(sanityProfileId);
  const query=`{"count":count(*[_type=="product"&&owner._ref==${owner}&&coalesce(listingStatus,"active")!="deleted"]),"first":*[_type=="product"&&owner._ref==${owner}&&(coalesce(listingStatus,"active") in ["active","paused","deleted"])]|order(_createdAt asc)[0]._createdAt}`;
  try{const response=await fetch(`https://${projectId}.api.sanity.io/v${apiVersion}/data/query/${dataset}?query=${encodeURIComponent(query)}`,{cache:'no-store'});if(!response.ok)return {count:0,firstPublishedAt:null};const data=await response.json() as {result?:{count?:number;first?:string|null}};return {count:Number(data.result?.count||0),firstPublishedAt:data.result?.first||null};}catch{return {count:0,firstPublishedAt:null};}
}

export default async function HostProfilePage({params}:{params:Promise<{locale:string}>}){
  const {locale}=await params; const en=locale==='en'; const supabase=await createClient(); const {data:{user}}=await supabase.auth.getUser();
  if(!user)redirect(`/topsecret/${locale}/logga-in?next=${encodeURIComponent(`/topsecret/${locale}/vard/profil`)}`);

  const [{data:profile},ownerSummary,{data:hostBookings},notificationCount,locationCount]=await Promise.all([
    supabase.from('profiles').select('display_name,city,avatar_url,sanity_profile_id,bankid_verified,identity_verification_status,payout_method_ready,payout_provider_account_id').eq('id',user.id).maybeSingle() as unknown as Promise<{data:Profile|null}>,
    getUserReviewSummary(user.id,'owner'),
    supabase.from('bookings').select('status,rental_price,refund_rental_amount').eq('owner_id',user.id),
    supabase.from('user_notifications').select('id',{count:'exact',head:true}).eq('user_id',user.id).is('read_at',null),
    supabase.from('host_pickup_locations').select('id',{count:'exact',head:true}).eq('user_id',user.id),
  ]);
  const listingFacts=await getListingFacts(profile?.sanity_profile_id);
  async function signOut(){'use server';const supabase=await createClient();await supabase.auth.signOut();redirect(`/topsecret/${locale}/logga-in`);}

  const rows=hostBookings||[];
  const identityReady=Boolean(profile?.bankid_verified||profile?.identity_verification_status==='verified');
  const photoReady=Boolean(profile?.avatar_url?.trim());
  const payoutReady=Boolean(profile?.payout_method_ready&&profile?.payout_provider_account_id);
  const locationReady=Boolean(locationCount.count);
  const progress=setupProgress({identityReady,photoReady,payoutReady,locationReady});
  const completedRentals=countCompletedRentals(rows);
  const estimatedRevenue=calculateEstimatedHostRevenue(rows);
  const hostTenure=formatProfileTenure(listingFacts.firstPublishedAt,locale);
  const displayName=profile?.display_name||(en?'Hyrbart user':'Hyrbart-användare'); const city=profile?.city; const initial=displayName.trim().charAt(0).toUpperCase()||'H';
  const publicProfileHref=`/${locale}/profil/${user.id}`; const insightsHref=`/topsecret/${locale}/vard/profil/omdomen?role=owner&back=vard`; const reviewCount=ownerSummary.count; const ratingLabel=ownerSummary.overall==null?'–':ownerSummary.overall.toFixed(2).replace('.',','); const unread=notificationCount.count||0;
  const currency=(value:number)=>`${value.toLocaleString(en?'en-GB':'sv-SE')} kr`;
  const row=(label:string,icon:MenuIconName,suffix?:string)=><><span className="profileMenuIcon"><MenuIcon name={icon}/></span><span className="profileMenuLabel">{label}</span>{suffix?<strong style={{marginLeft:'auto',fontSize:13}}>{suffix}</strong>:null}<MenuChevron/></>;
  const setupItems=[
    {label:en?'Identity':'Identitet',ready:identityReady,href:`/topsecret/${locale}/vard/onboarding/identitet`},
    {label:en?'Profile photo':'Profilbild',ready:photoReady,href:`/topsecret/${locale}/vard/profil/konto?back=vard&section=profile`},
    {label:en?'Payouts':'Utbetalning',ready:payoutReady,href:`/topsecret/${locale}/vard/onboarding/utbetalning`},
    {label:en?'Pickup location':'Utlämningsplats',ready:locationReady,href:`/topsecret/${locale}/vard/onboarding/profil`},
  ];
  const quickLinks=[
    {label:en?'Availability':'Tillgänglighet',copy:en?'Bookings and availability':'Bokningar och tillgänglighet',href:`/topsecret/${locale}/vard`},
    {label:en?'Payouts':'Utbetalningar',copy:en?'Manage payout details':'Hantera utbetalningsuppgifter',href:`/topsecret/${locale}/vard/onboarding/utbetalning`},
    {label:en?'Tax summary':'Skatteunderlag',copy:en?'Current-year rental summary':'Årets uthyrningsöversikt',href:`/topsecret/${locale}/vard/profil/skatteunderlag`},
    {label:en?'Help':'Hjälp',copy:en?'Get help with hosting':'Få hjälp med uthyrning',href:`/topsecret/${locale}/vard/profil/hjalp?back=vard`},
  ];

  return <section className="ds2Page profileDashboard">
    <header className="ds2Header"><h1>{en?'Profile':'Profil'}</h1></header>
    <div className="profileIdentityCard"><Link href={publicProfileHref} className="profileIdentityMain" aria-label={en?'View your public profile':'Visa din profil'} style={{color:'inherit',textDecoration:'none'}}>{profile?.avatar_url?<img className="profileAvatar" src={profile.avatar_url} alt={displayName} style={{objectFit:'cover'}}/>:<div className="profileAvatar">{initial}</div>}<div><h2>{displayName}</h2>{city?<p>{city}, Sverige</p>:null}</div></Link><div className="profileStats"><div><strong>{hostTenure}</strong><span>{en?'Time as host':'Tid som uthyrare'}</span></div><div><strong>{reviewCount}</strong><span>{en?'reviews':'omdömen'}</span></div><div><strong>{ratingLabel}</strong><span>{en?'average rating':'snittbetyg'}</span></div></div></div>

    <section className="profileOverviewSection" aria-labelledby="host-overview-heading"><div className="profileSectionHeading"><span>{en?'HOST OVERVIEW':'UTHYRARÖVERSIKT'}</span><h2 id="host-overview-heading">{en?'Your Hyrbart activity':'Din aktivitet på Hyrbart'}</h2></div><div className="profileMetricGrid">
      <Link href={`/topsecret/${locale}/vard/annonser`}><span>{en?'Listings':'Annonser'}</span><strong>{listingFacts.count}</strong></Link>
      <Link href={`/topsecret/${locale}/vard`}><span>{en?'Completed rentals':'Genomförda uthyrningar'}</span><strong>{completedRentals}</strong></Link>
      <Link href={`/topsecret/${locale}/vard/profil/skatteunderlag`}><span>{en?'Estimated revenue':'Uppskattad intäkt'}</span><strong>{currency(estimatedRevenue)}</strong></Link>
      <Link href={insightsHref}><span>{en?'Reviews':'Omdömen'}</span><strong>{reviewCount}{ownerSummary.overall!=null?<small> ★ {ratingLabel}</small>:null}</strong></Link>
    </div><p className="profileMetricNote">{en?'Estimated revenue is based on confirmed rental prices minus recorded rental refunds; it is not a payout or tax calculation.':'Uppskattad intäkt bygger på bekräftade hyresbelopp minus registrerade återbetalningar av hyresbelopp; det är inte en utbetalnings- eller skatteberäkning.'}</p></section>

    <section className="profileOverviewSection" aria-labelledby="account-overview-heading"><div className="profileSectionHeading profileSetupHeading"><div><span>{en?'ACCOUNT SETUP':'KONTOSTATUS'}</span><h2 id="account-overview-heading">{en?'Ready to host':'Redo att hyra ut'}</h2></div><strong>{progress.completed}/{progress.total}</strong></div><div className="profileProgressTrack" aria-label={en?`${progress.percent}% complete`:`${progress.percent}% klart`}><i style={{width:`${progress.percent}%`}}/></div><div className="profileSetupList">{setupItems.map(item=><Link href={item.href} key={item.label}><span className={item.ready?'profileStatusDot ready':'profileStatusDot'} aria-hidden="true">{item.ready?'✓':'!'}</span><span>{item.label}</span><strong>{item.ready?(en?'Ready':'Klart'):(en?'Complete':'Slutför')}</strong><MenuChevron/></Link>)}</div></section>

    <section className="profileOverviewSection" aria-labelledby="quick-links-heading"><div className="profileSectionHeading"><span>{en?'QUICK LINKS':'SNABBLÄNKAR'}</span><h2 id="quick-links-heading">{en?'Manage hosting':'Hantera uthyrningen'}</h2></div><div className="profileQuickGrid">{quickLinks.map(item=><Link href={item.href} key={item.href}><strong>{item.label}</strong><small>{item.copy}</small><span aria-hidden="true">›</span></Link>)}</div></section>

    <HostRevenueGoal locale={locale}/><Link className="modeSwitchButton profileModeSwitch" href={`/topsecret/${locale}`}>{en?'Switch to renter mode':'Växla till hyrarläge'}</Link>
    <div className="profileMenuSection"><span className="profileMenuSectionLabel">{en?'SETTINGS':'INSTÄLLNINGAR'}</span><div className="profileMenuList">
      <Link className="profileMenuRow" href={`/topsecret/${locale}/vard/profil/konto?back=vard`}>{row(en?'Account settings':'Kontoinställningar','account')}</Link>
      <Link className="profileMenuRow" href={`/topsecret/${locale}/vard/profil/sakerhet`}>{row(en?'Security':'Säkerhet','privacy')}</Link>
      <Link className="profileMenuRow" href={`/topsecret/${locale}/vard/installningar`}>{row(en?'Host settings':'Uthyrarinställningar','host')}</Link>
      <Link className="profileMenuRow" href={`/topsecret/${locale}/profil/notiser?back=vard`}>{row(en?'Notifications':'Notiser','notifications',unread?String(unread):undefined)}</Link>
      <Link className="profileMenuRow" href={`/topsecret/${locale}/vard/profil/foljare`}>{row(en?'My followers':'Mina följare','profile')}</Link>
      <Link className="profileMenuRow" href={`/topsecret/${locale}/vard/profil/varva`}>{row(en?'Refer a host':'Värva en uthyrare','referral')}</Link><ExternalHistoryModalSetting locale={locale}/><PushNotificationsSetting locale={locale}/><ProfileLanguageSetting locale={locale}/>
    </div></div>
    <div className="profileMenuSection"><span className="profileMenuSectionLabel">{en?'HELP & LEGAL':'HJÄLP & JURIDIK'}</span><div className="profileMenuList"><Link className="profileMenuRow" href={`/topsecret/${locale}/vard/profil/hjalp?back=vard`}>{row(en?'Get help':'Få hjälp','help')}</Link><Link className="profileMenuRow" href={publicProfileHref}>{row(en?'View profile':'Visa profil','profile')}</Link><Link className="profileMenuRow" href={`/topsecret/${locale}/vard/profil/villkor`}>{row(en?'Terms':'Allmänna villkor','terms')}</Link><Link className="profileMenuRow" href={`/topsecret/${locale}/vard/profil/sekretess?back=vard`}>{row(en?'Privacy':'Sekretess','privacy')}</Link></div></div>
    <div className="profileMenuSection profileLogoutSection"><form action={signOut} style={{margin:0}}><button type="submit" className="profileMenuRow profileMenuButton logout">{row(en?'Log out':'Logga ut','logout')}</button></form></div>
  </section>;
}
