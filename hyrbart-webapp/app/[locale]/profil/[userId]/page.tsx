import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createAdminClient } from '@/lib/supabase/admin';
import { getCompletedRentalCount, getPublicReviewsForUser, getUserReviewSummary } from '@/lib/review-summaries';
import { getVerifiedExternalReputation } from '@/lib/external-reputation';
import ReviewSummaryPanel from '@/components/ReviewSummaryPanel';
import { BackIcon, CheckIcon } from '@/components/Icons';

export const dynamic = 'force-dynamic';

const UUID_RE=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export default async function PublicReputationPassport({params}:{params:Promise<{locale:string;userId:string}>}){
  const {locale,userId}=await params;
  const en=locale==='en';
  if(!UUID_RE.test(userId))notFound();

  const admin=createAdminClient();
  const {data:profile,error}=await admin.from('profiles')
    .select('id,display_name,first_name,city,avatar_url,bio,bankid_verified,identity_verification_status,account_status,created_at')
    .eq('id',userId).maybeSingle();
  if(error||!profile||profile.account_status==='suspended'||profile.account_status==='closed')notFound();

  const [ownerSummary,ownerReviews,renterSummary,renterReviews,ownerRentals,renterRentals,external]=await Promise.all([
    getUserReviewSummary(userId,'owner'),
    getPublicReviewsForUser(userId,'owner'),
    getUserReviewSummary(userId,'renter'),
    getPublicReviewsForUser(userId,'renter'),
    getCompletedRentalCount(userId,'owner'),
    getCompletedRentalCount(userId,'renter'),
    getVerifiedExternalReputation(userId),
  ]);

  const name=profile.display_name||profile.first_name||(en?'Hyrbart user':'Hyrbart-användare');
  const verified=Boolean(profile.bankid_verified||profile.identity_verification_status==='verified');
  const initials=name.trim().slice(0,1).toUpperCase()||'?';
  const joined=new Intl.DateTimeFormat(en?'en-GB':'sv-SE',{year:'numeric',month:'long'}).format(new Date(profile.created_at));
  const totalReviews=ownerSummary.count+renterSummary.count;
  const totalRentals=ownerRentals+renterRentals;
  const weightedOverall=totalReviews?((ownerSummary.overall||0)*ownerSummary.count+(renterSummary.overall||0)*renterSummary.count)/totalReviews:null;

  return <section className="ds2Page publicReputationPage" style={{paddingBottom:120}}>
    <header className="publicProfileTop"><Link href={`/${locale}/produkter`} aria-label={en?'Back':'Tillbaka'}><BackIcon/></Link><h1>{en?'Reputation profile':'Omdömesprofil'}</h1></header>
    <div className="publicProfileHero">
      {profile.avatar_url?<img src={profile.avatar_url} alt={name}/>:<div className="publicProfileFallback">{initials}</div>}
      <h2>{name}</h2>
      <p>{profile.city?`${profile.city}, Sverige`:en?'Sweden':'Sverige'}</p>
      {verified?<div className="publicProfileVerified"><span><CheckIcon/></span>{en?'Verified identity':'Verifierad identitet'}</div>:null}
      {profile.bio?<p style={{maxWidth:520,marginTop:16,lineHeight:1.5}}>{profile.bio}</p>:null}
      <small style={{marginTop:10,color:'var(--muted)'}}>{en?`Member since ${joined}`:`Medlem sedan ${joined}`}</small>
    </div>

    <div className="publicProfileStats">
      <div><strong>{totalRentals}</strong><span>{en?'completed rentals':'slutförda hyror'}</span></div>
      <div><strong>{totalReviews}</strong><span>{en?'Hyrbart reviews':'Hyrbart-omdömen'}</span></div>
      <div><strong>{weightedOverall!=null?weightedOverall.toFixed(1).replace('.',','):'–'}</strong><span>{en?'Hyrbart rating':'Hyrbart-betyg'}</span></div>
    </div>

    {ownerSummary.count>0?<section style={{marginTop:24}}><h2 style={{margin:'0 20px 8px'}}>{en?'As an owner':'Som uthyrare'}</h2><ReviewSummaryPanel summary={ownerSummary} reviews={ownerReviews} kind="owner" locale={locale}/></section>:null}
    {renterSummary.count>0?<section style={{marginTop:24}}><h2 style={{margin:'0 20px 8px'}}>{en?'As a renter':'Som hyrestagare'}</h2><ReviewSummaryPanel summary={renterSummary} reviews={renterReviews} kind="renter" locale={locale}/></section>:null}
    {!totalReviews?<section className="reviewEmptyState"><h3>{en?'No published reviews yet':'Inga publicerade omdömen ännu'}</h3><p>{en?'Reviews appear here after the double-blind review period.':'Omdömen visas här efter den dubbelblinda recensionsperioden.'}</p></section>:null}

    {external.length?<section style={{margin:'24px 20px 0',padding:'18px',border:'1px solid var(--line)',borderRadius:20,background:'#fff'}}><h3 style={{margin:'0 0 6px'}}>{en?'Verified history from other platforms':'Verifierad historik från andra plattformar'}</h3><p style={{margin:'0 0 14px',color:'var(--muted)'}}>{en?'Shown separately and never mixed into Hyrbart ratings.':'Visas separat och blandas aldrig in i Hyrbarts egna betyg.'}</p><div style={{display:'grid',gap:10}}>{external.map(item=><a key={item.id} href={item.sourceProfileUrl} target="_blank" rel="noreferrer" style={{display:'flex',justifyContent:'space-between',gap:16,padding:'12px 14px',border:'1px solid var(--line)',borderRadius:14,textDecoration:'none',color:'inherit'}}><div><strong>{item.sourcePlatform==='hygglo'?'Hygglo':en?'Other platform':'Annan plattform'}</strong><small style={{display:'block',color:'var(--muted)'}}>✓ {en?'Verified by Hyrbart':'Verifierad av Hyrbart'}</small></div><div style={{textAlign:'right'}}><strong>{item.rating!=null?`★ ${item.rating.toFixed(1).replace('.',',')}`:'—'}</strong><small style={{display:'block'}}>{item.reviewCount!=null?`${item.reviewCount} ${en?'reviews':'omdömen'}`:''}</small></div></a>)}</div></section>:null}
  </section>;
}
