import Link from 'next/link';
import { redirect } from 'next/navigation';
import IdentityVerificationPanel from '@/components/IdentityVerificationPanel';
import { createClient } from '@/lib/supabase/server';
import '../profile-menu.css';

export default async function VerificationSafetyPage({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<{ back?: string }> }) {
  const { locale } = await params;
  const { back } = await searchParams;
  const en = locale === 'en';
  const hostMode = back === 'vard';
  const backHref = hostMode ? `/topsecret/${locale}/vard/installningar` : `/topsecret/${locale}/profil/installningar`;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/topsecret/${locale}/logga-in`);

  return <section className="ds2Page profileSettingsPage">
    <header className="profileSubHeader"><Link href={backHref} aria-label={en ? 'Back' : 'Tillbaka'}>‹</Link><h1>{en ? 'Verification & safety' : 'Verifiering & trygghet'}</h1></header>
    <p className="profileSettingsIntro">{en ? 'The same identity verification follows your Hyrbart account whether you rent or host.' : 'Samma identitetsverifiering följer ditt Hyrbart-konto oavsett om du hyr eller hyr ut.'}</p>
    <IdentityVerificationPanel locale={locale}/>
    <section className="profileSettingsCard">
      <div className="profileSettingsCardHeading"><span>{en ? 'DATA MINIMISATION' : 'DATAMINIMERING'}</span><h2>{en ? 'Hyrbart stores the result, not your identity document' : 'Hyrbart lagrar resultatet, inte din identitetshandling'}</h2></div>
      <p>{en ? 'The integration contract is designed to retain verification state, provider reference and timestamps only. Personal identity numbers, BankID secrets and raw provider payloads must not be stored in Hyrbart.' : 'Integrationskontraktet är utformat för att endast behålla verifieringsstatus, leverantörsreferens och tidsstämplar. Personnummer, BankID-hemligheter och råa leverantörssvar får inte lagras i Hyrbart.'}</p>
    </section>
    <section className="profileSettingsCard">
      <div className="profileSettingsCardHeading"><span>{en ? 'SAFETY' : 'TRYGGHET'}</span><h2>{en ? 'One status for both roles' : 'En status för båda rollerna'}</h2></div>
      <p>{en ? 'Identity status is shared across renting and hosting. The production provider is not connected yet; no local button or mock response can mark a production account as verified.' : 'Identitetsstatus delas mellan hyrar- och uthyrarläget. Produktionsleverantören är ännu inte ansluten; ingen lokal knapp eller mock-respons kan markera ett produktionskonto som verifierat.'}</p>
    </section>
  </section>;
}
