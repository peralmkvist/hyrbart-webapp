import Link from 'next/link';
import '../../profile-menu.css';

export default async function PaymentSettingsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const en = locale === 'en';
  return <section className="ds2Page profileSettingsPage">
    <header className="profileSubHeader"><Link href={`/topsecret/${locale}/profil/installningar`} aria-label={en ? 'Back' : 'Tillbaka'}>‹</Link><h1>{en ? 'Payment settings' : 'Betalningsinställningar'}</h1></header>
    <p className="profileSettingsIntro">{en ? 'Payment methods used when you rent through Hyrbart will be managed here.' : 'Här hanteras betalmetoder som används när du hyr via Hyrbart.'}</p>
    <section className="profileSettingsCard">
      <div className="profileSettingsCardHeading"><span>{en ? 'PAYMENTS' : 'BETALNINGAR'}</span><h2>{en ? 'Payment methods' : 'Betalmetoder'}</h2></div>
      <p>{en ? 'No saved payment methods are shown yet. Payment is currently handled in the booking flow.' : 'Inga sparade betalmetoder visas ännu. Betalning hanteras i nuläget i bokningsflödet.'}</p>
    </section>
  </section>;
}
