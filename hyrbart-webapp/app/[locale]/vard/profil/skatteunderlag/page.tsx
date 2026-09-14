import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { calculateEstimatedHostRevenue, countCompletedRentals } from '@/lib/host-profile-insights';
import '../../../../profil/profile-menu.css';

function yearBounds(now = new Date()) {
  const year = now.getUTCFullYear();
  return { year, first: `${year}-01-01`, last: `${year}-12-31` };
}

export default async function HostTaxSummaryPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const en = locale === 'en';
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/topsecret/${locale}/logga-in?next=${encodeURIComponent(`/topsecret/${locale}/vard/profil/skatteunderlag`)}`);

  const { year, first, last } = yearBounds();
  const { data: bookings, error } = await supabase
    .from('bookings')
    .select('status,rental_price,refund_rental_amount,start_date')
    .eq('owner_id', user.id)
    .gte('start_date', first)
    .lte('start_date', last);
  if (error) throw error;

  const rows = bookings || [];
  const revenue = calculateEstimatedHostRevenue(rows);
  const completed = countCompletedRentals(rows);
  const currency = (value: number) => `${value.toLocaleString(en ? 'en-GB' : 'sv-SE')} kr`;

  return <section className="ds2Page profileSettingsPage">
    <header className="profileSubHeader"><Link href={`/topsecret/${locale}/vard/profil`} aria-label={en ? 'Back' : 'Tillbaka'}>‹</Link><h1>{en ? 'Tax summary' : 'Skatteunderlag'}</h1></header>
    <p className="profileSettingsIntro">{en ? `A preliminary summary of your Hyrbart rentals for ${year}, based on booking data.` : `En preliminär sammanställning av dina Hyrbart-uthyrningar för ${year}, baserad på bokningsdata.`}</p>
    <section className="profileSettingsCard">
      <div className="profileSettingsCardHeading"><span>{year}</span><h2>{en ? 'Rental summary' : 'Uthyrningsöversikt'}</h2></div>
      <div className="profileTaxMetrics">
        <div><span>{en ? 'Estimated rental revenue' : 'Uppskattad hyresintäkt'}</span><strong>{currency(revenue)}</strong></div>
        <div><span>{en ? 'Completed rentals' : 'Genomförda uthyrningar'}</span><strong>{completed}</strong></div>
      </div>
      <p>{en ? 'Revenue includes paid, active, returned and completed bookings and subtracts recorded rental refunds. It is not a tax calculation and may differ from amounts that must be reported.' : 'Intäkten omfattar betalda, pågående, återlämnade och slutförda bokningar och drar av registrerade återbetalningar av hyresbelopp. Detta är inte en skatteberäkning och kan skilja sig från belopp som ska deklareras.'}</p>
    </section>
    <section className="profileSettingsCard profilePrivacyNotice"><strong>{en ? 'For your records' : 'För ditt underlag'}</strong><p>{en ? 'Use this overview as supporting information. Always verify the applicable tax rules and your final payment records before filing.' : 'Använd översikten som stöd. Kontrollera alltid gällande skatteregler och dina slutliga utbetalningsuppgifter innan deklaration.'}</p></section>
  </section>;
}
