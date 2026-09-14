import Link from 'next/link';
import { getProducts } from '@/lib/sanity-products';
import { getPublicReviewsForUser, getUserReviewSummary, resolveUserIdFromSanityProfile } from '@/lib/review-summaries';
import { getVerifiedExternalReputation } from '@/lib/external-reputation';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import ReviewSummaryPanel from '@/components/ReviewSummaryPanel';
import FollowButton from '@/components/FollowButton';
import { BackIcon, CheckIcon } from '@/components/Icons';

export const dynamic = 'force-dynamic';

export default async function PublicProfilePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const en = locale === 'en';
  const products = await getProducts();
  const ownerProducts = products.filter(product => product.owner?.name === 'Per');
  const owner = ownerProducts[0]?.owner ?? products.find(product => product.owner)?.owner;
  const userId = await resolveUserIdFromSanityProfile(owner?.id);
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const [summary,reviews,rentals,external] = userId ? await Promise.all([
    getUserReviewSummary(userId,'owner'),
    getPublicReviewsForUser(userId,'owner'),
    createAdminClient().from('bookings').select('id',{count:'exact',head:true}).eq('owner_id',userId).eq('status','completed'),
    getVerifiedExternalReputation(userId),
  ]) : [null,[],{count:0} as any,[]];
  const reviewCount=summary?.count||0;
  const rating=summary?.overall;

  return <section className="ds2Page publicReputationPage" style={{ paddingBottom: 120 }}>
      <header className="publicProfileTop"><Link href={`/${locale}/profil`} aria-label={en ? 'Back to profile' : 'Tillbaka till profil'}><BackIcon /></Link><h1>{en ? 'Profile' : 'Profil'}</h1></header>
      <div className="publicProfileHero">
        {owner?.profileImage?<img src={owner.profileImage} alt={owner.name || 'Per'} />:<div className="publicProfileFallback">P</div>}
        <h2>{owner?.name || 'Per'}</h2><p>{owner?.city || 'Danderyd'}, Sverige</p>
        <div className="publicProfileVerified"><span><CheckIcon /></span>{en ? 'Verified with BankID' : 'Identifierad via BankID'}</div>
        {userId && user?.id !== userId ? <div style={{marginTop:18}}><FollowButton userId={userId} locale={locale}/></div> : null}
      </div>
      <div className="publicProfileStats"><div><strong>{rentals.count||0}</strong><span>{en ? 'rentals' : 'uthyrningar'}</span></div><div><strong>{reviewCount}</strong><span>{en ? 'Hyrbart reviews' : 'Hyrbart-omdömen'}</span></div><div><strong>{rating!=null?rating.toFixed(1).replace('.',','):'–'}</strong><span>{en ? 'Hyrbart rating' : 'Hyrbart-betyg'}</span></div></div>
      {summary?.count?<ReviewSummaryPanel summary={summary} reviews={reviews} kind="owner" locale={locale}/>:<section className="reviewEmptyState"><h3>{en?'No published reviews yet':'Inga publicerade omdömen ännu'}</h3><p>{en?'Reviews appear here after the double-blind review period.':'Omdömen visas här efter den dubbelblinda recensionsperioden.'}</p></section>}
      {external.length?<section style={{margin:'24px 20px 0',padding:'18px',border:'1px solid var(--line)',borderRadius:20,background:'#fff'}}><h3 style={{margin:'0 0 6px'}}>{en?'Verified history from other platforms':'Verifierad historik från andra plattformar'}</h3><p style={{margin:'0 0 14px',color:'var(--muted)'}}>{en?'Shown separately and never mixed into Hyrbart ratings.':'Visas separat och blandas aldrig in i Hyrbarts egna betyg.'}</p><div style={{display:'grid',gap:10}}>{external.map(item=><a key={item.id} href={item.sourceProfileUrl} target="_blank" rel="noreferrer" style={{display:'flex',justifyContent:'space-between',gap:16,padding:'12px 14px',border:'1px solid var(--line)',borderRadius:14,textDecoration:'none',color:'inherit'}}><div><strong>{item.sourcePlatform==='hygglo'?'Hygglo':en?'Other platform':'Annan plattform'}</strong><small style={{display:'block',color:'var(--muted)'}}>{en?'Verified external history':'Verifierad extern historik'}</small></div><div style={{textAlign:'right'}}><strong>{item.rating!=null?`★ ${item.rating.toFixed(1).replace('.',',')}`:'—'}</strong><small style={{display:'block'}}>{item.reviewCount!=null?`${item.reviewCount} ${en?'reviews':'omdömen'}`:''}</small></div></a>)}</div></section>:null}
    </section>;
}
