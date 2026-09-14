import Link from 'next/link';
import { notFound } from 'next/navigation';
import FollowButton from '@/components/FollowButton';
import ProductVisual from '@/components/ProductVisual';
import ReviewSummaryPanel from '@/components/ReviewSummaryPanel';
import { BackIcon, CheckIcon } from '@/components/Icons';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { getProducts } from '@/lib/sanity-products';
import { getPublicReviewsForUser, getUserReviewSummary } from '@/lib/review-summaries';

export const dynamic = 'force-dynamic';

export default async function PublicUserProfilePage({params}:{params:Promise<{locale:string;id:string}>}){
  const {locale,id}=await params;
  const en=locale==='en';
  const admin=createAdminClient();
  const {data:profile}=await admin.from('profiles').select('id,display_name,city,avatar_url,bio,bankid_verified,sanity_profile_id,account_status').eq('id',id).eq('account_status','active').maybeSingle();
  if(!profile)notFound();
  const supabase=await createClient();
  const {data:{user}}=await supabase.auth.getUser();
  const [summary,reviews,rentals,products]=await Promise.all([
    getUserReviewSummary(id,'owner'),
    getPublicReviewsForUser(id,'owner'),
    admin.from('bookings').select('id',{count:'exact',head:true}).eq('owner_id',id).eq('status','completed'),
    getProducts(),
  ]);
  const listings=profile.sanity_profile_id?products.filter(product=>product.owner?.id===profile.sanity_profile_id).slice(0,12):[];
  const name=profile.display_name||(en?'Hyrbart user':'Hyrbart-användare');
  const initial=name.trim().charAt(0).toUpperCase()||'H';
  return <section className="ds2Page publicReputationPage" style={{paddingBottom:120}}>
    <header className="publicProfileTop"><Link href={`/${locale}/produkter`} aria-label={en?'Back':'Tillbaka'}><BackIcon/></Link><h1>{en?'Profile':'Profil'}</h1></header>
    <div className="publicProfileHero">
      {profile.avatar_url?<img src={profile.avatar_url} alt={name}/>:<div className="publicProfileFallback">{initial}</div>}
      <h2>{name}</h2>{profile.city?<p>{profile.city}, Sverige</p>:null}
      {profile.bankid_verified?<div className="publicProfileVerified"><span><CheckIcon/></span>{en?'Verified with BankID':'Identifierad via BankID'}</div>:null}
      {profile.bio?<p style={{maxWidth:560,textAlign:'center',margin:'12px auto 0',color:'var(--muted)'}}>{profile.bio}</p>:null}
      {user?.id!==id?<div style={{marginTop:18}}><FollowButton userId={id} locale={locale}/></div>:null}
    </div>
    <div className="publicProfileStats"><div><strong>{rentals.count||0}</strong><span>{en?'rentals':'uthyrningar'}</span></div><div><strong>{summary.count||0}</strong><span>{en?'reviews':'omdömen'}</span></div><div><strong>{summary.overall!=null?summary.overall.toFixed(1).replace('.',','):'–'}</strong><span>{en?'rating':'betyg'}</span></div></div>
    {listings.length?<section style={{margin:'26px 20px 0'}}><h3>{en?'Active listings':'Aktiva annonser'}</h3><div className="productGrid2">{listings.map(product=><Link key={product.slug} href={`/${locale}/produkter/${product.slug}`} className="productTile2"><div className="productTileVisual2"><ProductVisual kind="cleaner" accent={product.accent} imageSrc={product.image} imageAlt={`${product.brand} ${product.name}`}/></div><div className="productTileCopy2"><strong className="productTileTitle2"><span className="productTileBrand2">{product.brand}</span><span className="productTileName2">{product.name}</span></strong><span>{en?(product.typeEn??product.type):product.type}</span><b>{product.price}</b></div></Link>)}</div></section>:null}
    {summary.count?<ReviewSummaryPanel summary={summary} reviews={reviews} kind="owner" locale={locale}/>:<section className="reviewEmptyState"><h3>{en?'No published reviews yet':'Inga publicerade omdömen ännu'}</h3><p>{en?'Reviews appear here after the review period.':'Omdömen visas här efter recensionsperioden.'}</p></section>}
  </section>;
}
