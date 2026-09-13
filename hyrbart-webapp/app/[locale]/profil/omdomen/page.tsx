import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getPublicReviewsForUser, getUserReviewSummary } from '@/lib/review-summaries';
import ReviewSummaryPanel from '@/components/ReviewSummaryPanel';
import '../profile-menu.css';

export default async function ProfileReviewsPage({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<{ role?: string; back?: string }> }) {
  const { locale } = await params;
  const { role, back } = await searchParams;
  const en = locale === 'en';
  const as = role === 'owner' ? 'owner' : 'renter';
  const hostMode = back === 'vard' || as === 'owner';
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/topsecret/${locale}/logga-in`);
  const [summary, reviews] = await Promise.all([
    getUserReviewSummary(user.id, as),
    getPublicReviewsForUser(user.id, as),
  ]);
  const backHref = hostMode ? `/topsecret/${locale}/vard/profil` : `/topsecret/${locale}/profil`;

  return <section className="ds2Page profileSettingsPage profileInsightsPage">
    <header className="profileSubHeader profileInsightsHeader"><Link href={backHref} aria-label={en ? 'Back' : 'Tillbaka'}>‹</Link><h1>{en ? 'Insights' : 'Insikter'}</h1></header>
    <p className="profileSettingsIntro">{as === 'owner' ? (en ? 'Insights from your activity as a host.' : 'Insikter från ditt uthyrande.') : (en ? 'Insights from your activity as a renter.' : 'Insikter från ditt hyrande.')}</p>
    {summary.count > 0 ? <ReviewSummaryPanel summary={summary} reviews={reviews} kind={as} locale={locale} /> : <section className="profileSettingsCard profileEmptySettingsState"><div className="profileSettingsCardHeading"><span>{en ? 'REVIEWS' : 'OMDÖMEN'}</span><h2>{en ? 'No published reviews yet' : 'Inga publicerade omdömen ännu'}</h2></div><p>{en ? 'Reviews appear here after the double-blind review period.' : 'Omdömen visas här efter den dubbelblinda recensionsperioden.'}</p></section>}
  </section>;
}
