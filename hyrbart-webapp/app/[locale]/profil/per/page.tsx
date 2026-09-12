import Link from 'next/link';
import { getProducts } from '@/lib/sanity-products';
import { getPublicReviewsForUser, getUserReviewSummary, resolveUserIdFromSanityProfile } from '@/lib/review-summaries';
import { createAdminClient } from '@/lib/supabase/admin';
import ReviewSummaryPanel from '@/components/ReviewSummaryPanel';
import { BackIcon, CheckIcon } from '@/components/Icons';

export default async function PublicProfilePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const en = locale === 'en';
  const products = await getProducts();
  const ownerProducts = products.filter(product => product.owner?.name === 'Per');
  const owner = ownerProducts[0]?.owner ?? products.find(product => product.owner)?.owner;
  const userId = await resolveUserIdFromSanityProfile(owner?.id);
  const [summary,reviews,rentals] = userId ? await Promise.all([
    getUserReviewSummary(userId,'owner'),
    getPublicReviewsForUser(userId,'owner'),
    createAdminClient().from('bookings').select('id',{count:'exact',head:true}).eq('owner_id',userId).eq('status','completed'),
  ]) : [null,[],{count:0} as any];
  const reviewCount=summary?.count||0;
  const rating=summary?.overall;

  return <section className="ds2Page publicReputationPage" style={{ paddingBottom: 120 }}>
      <header className="publicProfileTop"><Link href={`/${locale}/profil`} aria-label={en ? 'Back to profile' : 'Tillbaka till profil'}><BackIcon /></Link><h1>{en ? 'Profile' : 'Profil'}</h1></header>
      <div className="publicProfileHero">
        {owner?.profileImage?<img src={owner.profileImage} alt={owner.name || 'Per'} />:<div className="publicProfileFallback">P</div>}
        <h2>{owner?.name || 'Per'}</h2><p>{owner?.city || 'Danderyd'}, Sverige</p>
        <div className="publicProfileVerified"><span><CheckIcon /></span>{en ? 'Verified with BankID' : 'Identifierad via BankID'}</div>
      </div>
      <div className="publicProfileStats"><div><strong>{rentals.count||0}</strong><span>{en ? 'rentals' : 'uthyrningar'}</span></div><div><strong>{reviewCount}</strong><span>{en ? 'reviews' : 'omdömen'}</span></div><div><strong>{rating!=null?rating.toFixed(1).replace('.',','):'–'}</strong><span>{en ? 'rating' : 'betyg'}</span></div></div>
      {summary?.count?<ReviewSummaryPanel summary={summary} reviews={reviews} kind="owner" locale={locale}/>:<section className="reviewEmptyState"><h3>{en?'No published reviews yet':'Inga publicerade omdömen ännu'}</h3><p>{en?'Reviews appear here after the double-blind review period.':'Omdömen visas här efter den dubbelblinda recensionsperioden.'}</p></section>}
    </section>;
}
