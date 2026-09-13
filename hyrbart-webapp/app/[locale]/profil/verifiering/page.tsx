import Link from 'next/link';
import { redirect } from 'next/navigation';
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
  const { data: profile } = await supabase.from('profiles')
    .select('bankid_verified,identity_verification_status,identity_verification_provider,identity_verified_at')
    .eq('id', user.id).maybeSingle();
  const verified = Boolean(profile?.bankid_verified || profile?.identity_verification_status === 'verified');
  const pending = profile?.identity_verification_status === 'pending';

  return <section className="ds2Page profileSettingsPage">
    <header className="profileSubHeader"><Link href={backHref} aria-label={en ? 'Back' : 'Tillbaka'}>‹</Link><h1>{en ? 'Verification & safety' : 'Verifiering & trygghet'}</h1></header>
    <p className="profileSettingsIntro">{en ? 'The same identity verification follows your Hyrbart account whether you rent or host.' : 'Samma identitetsverifiering följer ditt Hyrbart-konto oavsett om du hyr eller hyr ut.'}</p>
    <section className="profileSettingsCard">
      <div className="profileSettingsCardHeading"><span>{en ? 'IDENTITY' : 'IDENTITET'}</span><h2>{verified ? (en ? 'Identity verified' : 'Identiteten är verifierad') : pending ? (en ? 'Verification pending' : 'Verifiering pågår') : (en ? 'Identity not verified' : 'Identiteten är inte verifierad')}</h2></div>
      <p>{verified ? (en ? `Your verification is complete${profile?.identity_verification_provider ? ` via ${profile.identity_verification_provider}` : ''}.` : `Din verifiering är klar${profile?.identity_verification_provider ? ` via ${profile.identity_verification_provider}` : ''}.`) : (en ? 'Hyrbart will connect an approved identity provider here. Only the verification result and provider reference should be stored by Hyrbart.' : 'Här kopplas en godkänd identitetsleverantör in. Hyrbart ska endast lagra verifieringsresultat och leverantörsreferens.')}</p>
    </section>
    <section className="profileSettingsCard">
      <div className="profileSettingsCardHeading"><span>{en ? 'SAFETY' : 'TRYGGHET'}</span><h2>{en ? 'A safer rental' : 'En tryggare uthyrning'}</h2></div>
      <p>{en ? 'Identity status is shared across both roles. Booking agreements, payment status, messages and issue reporting remain tied to each booking.' : 'Identitetsstatus delas mellan båda rollerna. Bokningsavtal, betalningsstatus, meddelanden och ärendehantering är fortsatt knutna till respektive bokning.'}</p>
    </section>
  </section>;
}
