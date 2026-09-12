import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export default async function HostOnboardingPage({params}:{params:Promise<{locale:string}>}){
  const {locale}=await params; const en=locale==='en';
  const supabase=await createClient();
  const {data:{user}}=await supabase.auth.getUser();
  if(!user) redirect(`/topsecret/${locale}/logga-in?next=${encodeURIComponent(`/${locale}/vard/onboarding`)}`);
  const {data:profile}=await supabase.from('profiles').select('display_name,city,payout_method_ready,sanity_profile_id').eq('id',user.id).maybeSingle();
  const identityReady=Boolean(profile?.display_name&&profile?.city&&profile?.sanity_profile_id);
  const payoutReady=Boolean(profile?.payout_method_ready);
  const ready=identityReady&&payoutReady;
  return <section className="hostOnboardingPage">
    <header><Link href={`/${locale}/vard/annonser`} aria-label={en?'Back':'Tillbaka'}>‹</Link><span>{en?'Become a host':'Bli uthyrare'}</span></header>
    <div className="hostOnboardingHero"><span>{en?'HOST ONBOARDING':'UTHYRARSTART'}</span><h1>{ready?(en?'You are ready to publish':'Du är redo att publicera'):(en?'Get ready to rent out':'Gör dig redo att hyra ut')}</h1><p>{en?'We make sure the essentials are in place before your first listing goes live.':'Vi ser till att grunderna är på plats innan din första annons kan publiceras.'}</p></div>
    <div className="hostOnboardingSteps">
      <div className={identityReady?'done':''}><i>{identityReady?'✓':'1'}</i><span><strong>{en?'Host profile':'Uthyrarprofil'}</strong><small>{identityReady?(en?'Name and location are ready.':'Namn och ort är klara.'):(en?'Add your name and pickup area in profile settings.':'Lägg till namn och utlämningsort i profilinställningarna.')}</small></span></div>
      <div className={payoutReady?'done':''}><i>{payoutReady?'✓':'2'}</i><span><strong>{en?'Payout account':'Utbetalningskonto'}</strong><small>{payoutReady?(en?'Connected.':'Kopplat.'):(en?'Required before a listing can be published.':'Krävs innan en annons kan publiceras.')}</small></span></div>
      <div className={identityReady?'done':''}><i>{identityReady?'✓':'3'}</i><span><strong>{en?'Create your first listing':'Skapa din första annons'}</strong><small>{en?'You can prepare and save a draft before payout setup is complete.':'Du kan förbereda och spara ett utkast innan utbetalningskontot är klart.'}</small></span></div>
    </div>
    {!identityReady?<Link className="hostOnboardingPrimary" href={`/${locale}/vard/profil`}>{en?'Complete profile':'Komplettera profil'}</Link>:null}
    {identityReady&&!payoutReady?<div className="hostOnboardingNotice"><strong>{en?'Payout setup is not connected yet':'Utbetalningskonto är inte kopplat ännu'}</strong><p>{en?'You can create and save a draft now. Publishing stays blocked until a payout account is connected.':'Du kan skapa och spara ett utkast redan nu. Publicering är spärrad tills utbetalningskonto är kopplat.'}</p></div>:null}
    {identityReady?<Link className="hostOnboardingPrimary" href={`/${locale}/vard/annonser/ny`}>{ready?(en?'Create listing':'Skapa annons'):(en?'Create draft':'Skapa utkast')} →</Link>:null}
  </section>;
}
