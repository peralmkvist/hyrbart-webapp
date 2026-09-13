import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export default async function IdentityOnboardingPage({params}:{params:Promise<{locale:string}>}){
  const {locale}=await params;
  const en=locale==='en';
  const supabase=await createClient();
  const {data:{user}}=await supabase.auth.getUser();
  if(!user)redirect(`/topsecret/${locale}/logga-in?next=${encodeURIComponent(`/${locale}/vard/onboarding/identitet`)}`);
  const {data:profile}=await supabase.from('profiles')
    .select('bankid_verified,identity_verification_status,identity_verification_provider,identity_verified_at')
    .eq('id',user.id).maybeSingle();
  const verified=Boolean(profile?.bankid_verified||profile?.identity_verification_status==='verified');
  const pending=profile?.identity_verification_status==='pending';

  return <section className="hostOnboardingPage payoutSetupPage">
    <header><Link href={`/${locale}/vard/onboarding`} aria-label={en?'Back':'Tillbaka'}>‹</Link><span>{en?'Identity verification':'Identitetsverifiering'}</span></header>
    <div className="hostOnboardingHero payoutSetupHero"><span>{en?'STEP 3 OF 4':'STEG 3 AV 4'}</span><h1>{verified?(en?'Identity verified':'Identiteten är verifierad'):(en?'Verify that you are you':'Verifiera att du är du')}</h1><p>{verified?(en?'Your identity has been verified and this requirement is complete.':'Din identitet är verifierad och det här kravet är klart.'):(en?'Before a host can publish listings, Hyrbart will use an approved identity provider. Hyrbart should only store the verification result and provider reference — not identity-document images.':'Innan en uthyrare kan publicera annonser kommer Hyrbart använda en godkänd identitetsleverantör. Hyrbart ska endast spara verifieringsresultat och leverantörsreferens – inte bilder av identitetshandlingar.')}</p></div>

    {verified?<div className="payoutConnectedCard"><div className="payoutStatusIcon">✓</div><div><strong>{en?'Verified':'Verifierad'}</strong><span>{profile?.identity_verification_provider?`${en?'Provider':'Leverantör'}: ${profile.identity_verification_provider}`:(en?'Legacy BankID verification':'Tidigare BankID-verifiering')}</span></div></div>:<>
      <div className="payoutInfoCard">
        <div className="payoutInfoRow"><i>1</i><div><strong>{en?'Start securely':'Starta säkert'}</strong><span>{en?'Continue to the selected verification provider.':'Fortsätt till vald verifieringsleverantör.'}</span></div></div>
        <div className="payoutInfoRow"><i>2</i><div><strong>{en?'Verify identity':'Verifiera identitet'}</strong><span>{en?'The provider performs the identity check.':'Leverantören genomför identitetskontrollen.'}</span></div></div>
        <div className="payoutInfoRow"><i>3</i><div><strong>{en?'Return to Hyrbart':'Tillbaka till Hyrbart'}</strong><span>{en?'A signed callback updates only the verification state.':'En signerad återkoppling uppdaterar endast verifieringsstatusen.'}</span></div></div>
      </div>
      <button className="hostOnboardingPrimary payoutProviderButton" type="button" disabled>{pending?(en?'Verification pending':'Verifiering pågår'):(en?'Verify identity':'Verifiera identitet')}</button>
      <p className="payoutPendingProvider">{en?'The button is activated when the identity provider integration is selected and connected.':'Knappen aktiveras när identitetsleverantören är vald och integrationen är ansluten.'}</p>
    </>}
    <Link className="payoutSkipLink" href={`/${locale}/vard/onboarding`}>{en?'Back to checklist':'Till checklistan'} →</Link>
  </section>;
}
