import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getUserReviewSummary } from '@/lib/review-summaries';
import '../../../profil/profile-menu.css';
import '../host-profile-insights.css';

type Profile = { sanity_profile_id:string|null };
type Booking = { status:string; start_date:string; end_date:string };

async function getListingCount(sanityProfileId?:string|null){
  if(!sanityProfileId)return 0;
  const projectId='djps09z6',dataset='production',apiVersion='2026-09-08',owner=JSON.stringify(sanityProfileId);
  const query=`count(*[_type=="product"&&owner._ref==${owner}&&coalesce(listingStatus,"active")!="deleted"])`;
  try{const response=await fetch(`https://${projectId}.api.sanity.io/v${apiVersion}/data/query/${dataset}?query=${encodeURIComponent(query)}`,{cache:'no-store'});if(!response.ok)return 0;const data=await response.json() as {result?:number};return Number(data.result||0);}catch{return 0;}
}

export default async function HostInsightsPage({params}:{params:Promise<{locale:string}>}){
  const {locale}=await params; const en=locale==='en'; const supabase=await createClient(); const {data:{user}}=await supabase.auth.getUser();
  if(!user)redirect(`/topsecret/${locale}/logga-in?next=${encodeURIComponent(`/topsecret/${locale}/vard/profil/insikter`)}`);
  const [{data:profile},{data:bookings},reviewSummary]=await Promise.all([
    supabase.from('profiles').select('sanity_profile_id').eq('id',user.id).maybeSingle() as unknown as Promise<{data:Profile|null}>,
    supabase.from('bookings').select('status,start_date,end_date').eq('owner_id',user.id) as unknown as Promise<{data:Booking[]|null}>,
    getUserReviewSummary(user.id,'owner'),
  ]);
  const listingCount=await getListingCount(profile?.sanity_profile_id);
  const rows=bookings||[]; const today=new Date().toISOString().slice(0,10);
  const completed=rows.filter(row=>row.status==='completed').length;
  const active=rows.filter(row=>row.status==='active').length;
  const upcoming=rows.filter(row=>['paid','accepted','reserved'].includes(row.status)&&row.start_date>=today).length;
  const reviewCount=reviewSummary.count; const rating=reviewSummary.overall==null?'–':reviewSummary.overall.toFixed(2).replace('.',',');
  return <section className="ds2Page profileSettingsPage profileInsightsPage">
    <header className="profileSubHeader"><Link href={`/topsecret/${locale}/vard/profil`} aria-label={en?'Back':'Tillbaka'}>‹</Link><h1>{en?'Insights':'Insikter'}</h1></header>
    <p className="profileSettingsIntro">{en?'Rental activity and performance for your listings. Financial data is kept separately under Revenue.':'Uthyrningsdata och aktivitet för dina annonser. Ekonomisk data ligger separat under Intäkter.'}</p>
    <section className="profileOverviewSection"><div className="profileSectionHeading"><span>{en?'RENTAL DATA':'UTHYRNINGSDATA'}</span><h2>{en?'Your activity':'Din uthyrningsaktivitet'}</h2></div><div className="profileMetricGrid"><Link href={`/topsecret/${locale}/vard/annonser`}><span>{en?'Listings':'Annonser'}</span><strong>{listingCount}</strong></Link><Link href={`/topsecret/${locale}/vard/bokningar`}><span>{en?'Completed rentals':'Genomförda uthyrningar'}</span><strong>{completed}</strong></Link><Link href={`/topsecret/${locale}/vard/bokningar`}><span>{en?'Ongoing rentals':'Pågående uthyrningar'}</span><strong>{active}</strong></Link><Link href={`/topsecret/${locale}/vard/bokningar`}><span>{en?'Upcoming rentals':'Kommande uthyrningar'}</span><strong>{upcoming}</strong></Link></div></section>
    <section className="profileOverviewSection"><div className="profileSectionHeading"><span>{en?'REVIEWS':'OMDÖMEN'}</span><h2>{en?'Renter feedback':'Feedback från hyrare'}</h2></div><div className="profileMetricGrid"><Link href={`/topsecret/${locale}/vard/profil/omdomen?role=owner&back=vard`}><span>{en?'Reviews':'Omdömen'}</span><strong>{reviewCount}</strong></Link><Link href={`/topsecret/${locale}/vard/profil/omdomen?role=owner&back=vard`}><span>{en?'Average rating':'Snittbetyg'}</span><strong>{rating}{reviewSummary.overall!=null?<small> ★</small>:null}</strong></Link></div></section>
  </section>;
}
