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
    <p className="profileSettingsIntro">{en ? 'Verify your identity with Swedish BankID. The same verification follows your Hyrbart account whether you rent or host.' : 'Verifiera din identitet med svenskt BankID. Samma verifiering följer ditt Hyrbart-konto oavsett om du hyr eller hyr ut.'}</p>
    <IdentityVerificationPanel locale={locale}/>
    <section className="profileSettingsCard">
      <div className="profileSettingsCardHeading"><span>{en ? 'DATA MINIMISATION' : 'DATAMINIMERING'}</span><h2>{en ? 'Hyrbart stores the result, not your BankID credentials' : 'Hyrbart lagrar resultatet, inte dina BankID-uppgifter'}</h2></div>
      <p>{en ? 'Hyrbart retains verification state, provider and timestamps needed for the service. Personal identity numbers, BankID secrets and raw identity-provider responses are not stored.' : 'Hyrbart sparar verifieringsstatus, leverantör och tidsstämplar som behövs för tjänsten. Personnummer, BankID-hemligheter och råa svar från identitetsleverantören lagras inte.'}</p>
    </section>
    <section className="profileSettingsCard">
      <div className="profileSettingsCardHeading"><span>{en ? 'SAFETY' : 'TRYGGHET'}</span><h2>{en ? 'One verification for both roles' : 'En verifiering för båda rollerna'}</h2></div>
      <p>{en ? 'Identity status is shared across renting and hosting. Verification is performed through Idura and Swedish BankID and is only attached to the Hyrbart account that started the flow.' : 'Identitetsstatus delas mellan hyrar- och uthyrarläget. Verifieringen görs via Idura och svenskt BankID och kopplas endast till det Hyrbart-konto som startade flödet.'}</p>
    </section>
  </section>;
}
