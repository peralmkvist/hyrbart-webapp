import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

const projectId='djps09z6';
const dataset='production';
const apiVersion='2026-09-08';

async function hasPickupLocation(profileId?:string|null){
  if(!profileId)return false;
  try{
    const query=`count(*[_type=="pickupLocation" && owner._ref==${JSON.stringify(profileId)}])`;
    const response=await fetch(`https://${projectId}.api.sanity.io/v${apiVersion}/data/query/${dataset}?query=${encodeURIComponent(query)}`,{cache:'no-store'});
    if(!response.ok)return false;
    const data=await response.json() as {result?:number};
    return Number(data.result||0)>0;
  }catch{return false}
}

export default async function HostOnboardingPage({params}:{params:Promise<{locale:string}>}){
  const {locale}=await params; const en=locale==='en';
  const supabase=await createClient();
  const {data:{user}}=await supabase.auth.getUser();
  if(!user) redirect(`/topsecret/${locale}/logga-in?next=${encodeURIComponent(`/${locale}/vard/onboarding`)}`);
  const {data:profile}=await supabase.from('profiles').select('display_name,payout_method_ready,payout_provider_account_id,bankid_verified,sanity_profile_id').eq('id',user.id).maybeSingle();
  const pickupReady=await hasPickupLocation(profile?.sanity_profile_id);
  const profileReady=Boolean(profile?.display_name&&profile?.sanity_profile_id&&pickupReady);
  const payoutReady=Boolean(profile?.payout_method_ready&&profile?.payout_provider_account_id);
  const bankIdReady=Boolean(profile?.bankid_verified);
  const ready=profileReady&&payoutReady&&bankIdReady;
  return <section className="hostOnboardingPage">
    <header><Link href={`/${locale}/vard/annonser`} aria-label={en?'Back':'Tillbaka'}>‹</Link><span>{en?'Become a host':'Bli uthyrare'}</span></header>
    <div className="hostOnboardingHero"><span>{en?'HOST ONBOARDING':'UTHYRARSTART'}</span><h1>{ready?(en?'You are ready to publish':'Du är redo att publicera'):(en?'Get ready to rent out':'Gör dig redo att hyra ut')}</h1><p>{en?'We make sure the essentials are in place before your first listing goes live.':'Vi ser till att grunderna är på plats innan din första annons kan publiceras.'}</p></div>
    <div className="hostOnboardingSteps">
      <Link className={`hostOnboardingStep ${profileReady?'done':''}`} href={`/${locale}/vard/onboarding/profil`}>
        <i>{profileReady?'✓':'1'}</i><span><strong>{en?'Host profile':'Uthyrarprofil'}</strong><small>{profileReady?(en?'Name and pickup location are ready.':'Namn och utlämningsplats är klara.'):(en?'Add your name and one or more pickup locations.':'Lägg till namn och en eller flera utlämningsplatser.')}</small></span><b>›</b>
      </Link>
      <Link className={`hostOnboardingStep ${payoutReady?'done':''} ${!profileReady?'locked':''}`} href={profileReady?`/${locale}/vard/onboarding/utbetalning`:'#'} aria-disabled={!profileReady}>
        <i>{payoutReady?'✓':'2'}</i><span><strong>{en?'Payout account':'Utbetalningskonto'}</strong><small>{payoutReady?(en?'Connected.':'Kopplat.'):(en?'Connect the account where your rental income should be paid.':'Anslut kontot dit dina hyresintäkter ska betalas ut.')}</small></span>{profileReady?<b>›</b>:null}
      </Link>
      <div className={bankIdReady?'done':''}><i>{bankIdReady?'✓':'3'}</i><span><strong>{en?'Verified with BankID':'Verifierad med BankID'}</strong><small>{bankIdReady?(en?'Identity verified.':'Identiteten är verifierad.'):(en?'Identity verification with BankID is required before publishing.':'Identitetsverifiering med BankID krävs innan publicering.')}</small></span></div>
      <div><i>4</i><span><strong>{en?'Create your first listing':'Skapa din första annons'}</strong><small>{en?'You can prepare and save a draft before every step above is complete.':'Du kan förbereda och spara ett utkast innan alla stegen ovan är klara.'}</small></span></div>
    </div>
    {!profileReady?<Link className="hostOnboardingPrimary" href={`/${locale}/vard/onboarding/profil`}>{en?'Complete profile':'Komplettera profil'}</Link>:null}
    {profileReady&&!payoutReady?<Link className="hostOnboardingPrimary" href={`/${locale}/vard/onboarding/utbetalning`}>{en?'Set up payout account':'Lägg till utbetalningskonto'} →</Link>:null}
    {profileReady&&payoutReady&&!bankIdReady?<div className="hostOnboardingNotice"><strong>{en?'BankID verification remains':'BankID-verifiering återstår'}</strong><p>{en?'BankID will be required before a listing can be published. The verification connection is the next integration step.':'BankID kommer krävas innan en annons kan publiceras. Själva verifieringskopplingen är nästa integrationssteg.'}</p></div>:null}
    {profileReady&&payoutReady?<Link className="hostOnboardingPrimary" href={`/${locale}/vard/annonser/ny`}>{ready?(en?'Create listing':'Skapa annons'):(en?'Create draft':'Skapa utkast')} →</Link>:null}
  </section>;
}
