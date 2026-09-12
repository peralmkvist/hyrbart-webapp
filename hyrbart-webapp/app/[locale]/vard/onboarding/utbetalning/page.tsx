import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export default async function PayoutOnboardingPage({params}:{params:Promise<{locale:string}>}){
  const {locale}=await params; const en=locale==='en';
  const supabase=await createClient();
  const {data:{user}}=await supabase.auth.getUser();
  if(!user) redirect(`/topsecret/${locale}/logga-in?next=${encodeURIComponent(`/${locale}/vard/onboarding/utbetalning`)}`);

  const {data:profile}=await supabase.from('profiles')
    .select('display_name,payout_method_ready,payout_provider_account_id,sanity_profile_id')
    .eq('id',user.id).maybeSingle();

  if(!profile?.display_name||!profile?.sanity_profile_id) redirect(`/topsecret/${locale}/vard/onboarding/profil`);

  const connected=Boolean(profile.payout_method_ready&&profile.payout_provider_account_id);

  return <section className="hostOnboardingPage payoutSetupPage">
    <header><Link href={`/${locale}/vard/onboarding`} aria-label={en?'Back':'Tillbaka'}>‹</Link><span>{en?'Payout account':'Utbetalningskonto'}</span></header>

    <div className="hostOnboardingHero payoutSetupHero">
      <span>{en?'STEP 2 OF 4':'STEG 2 AV 4'}</span>
      <h1>{connected?(en?'Payout account connected':'Utbetalningskonto kopplat'):(en?'Where should we send your money?':'Vart ska vi betala ut dina pengar?')}</h1>
      <p>{connected
        ? (en?'Your payout account is connected and ready for future rental income.':'Ditt utbetalningskonto är kopplat och redo för framtida hyresintäkter.')
        : (en?'Your bank details will be handled securely by our payment provider. Hyrbart will not store your bank account details.':'Dina bankuppgifter kommer hanteras säkert av vår betalleverantör. Hyrbart kommer inte lagra dina bankkontouppgifter.')}</p>
    </div>

    {connected?<>
      <div className="payoutConnectedCard">
        <div className="payoutStatusIcon">✓</div>
        <div><strong>{en?'Ready for payouts':'Redo för utbetalningar'}</strong><span>{en?'You can change payout details later in your host profile.':'Du kommer kunna ändra utbetalningsuppgifter senare i din uthyrarprofil.'}</span></div>
      </div>
      <Link className="hostOnboardingPrimary" href={`/${locale}/vard/onboarding`}>{en?'Continue':'Fortsätt'} →</Link>
    </>:<>
      <div className="payoutInfoCard">
        <div className="payoutInfoRow"><i>1</i><div><strong>{en?'Connect securely':'Anslut säkert'}</strong><span>{en?'You will continue to our payment provider to add your payout account.':'Du går vidare till vår betalleverantör för att lägga till ditt utbetalningskonto.'}</span></div></div>
        <div className="payoutInfoRow"><i>2</i><div><strong>{en?'Account is verified':'Kontot verifieras'}</strong><span>{en?'The provider verifies that the account can receive payouts.':'Leverantören verifierar att kontot kan ta emot utbetalningar.'}</span></div></div>
        <div className="payoutInfoRow"><i>3</i><div><strong>{en?'Return to Hyrbart':'Tillbaka till Hyrbart'}</strong><span>{en?'Once approved, this step is marked complete automatically.':'När kontot är godkänt markeras steget automatiskt som klart.'}</span></div></div>
      </div>

      <div className="payoutSecurityNote">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 10V8a5 5 0 0 1 10 0v2"/><rect x="5" y="10" width="14" height="10" rx="3"/><path d="M12 14v2"/></svg>
        <div><strong>{en?'Secure payout setup':'Säker anslutning'}</strong><span>{en?'We will use a licensed payment provider for bank account collection and payouts. No bank details are entered into or stored by Hyrbart.':'Vi kommer använda en licensierad betalleverantör för bankkonto och utbetalningar. Inga bankuppgifter skrivs in i eller lagras av Hyrbart.'}</span></div>
      </div>

      <button className="hostOnboardingPrimary payoutProviderButton" type="button" disabled>{en?'Connect payout account':'Anslut utbetalningskonto'}</button>
      <p className="payoutPendingProvider">{en?'This button will be activated when the payment provider integration is connected.':'Knappen aktiveras när integrationen med vald betalleverantör är på plats.'}</p>
      <Link className="payoutSkipLink" href={`/${locale}/vard/annonser/ny`}>{en?'Create a draft meanwhile':'Skapa ett utkast under tiden'} →</Link>
    </>}
  </section>;
}
