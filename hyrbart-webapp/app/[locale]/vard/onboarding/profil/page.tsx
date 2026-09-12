import Link from 'next/link';
import HostProfileSetupForm from '@/components/HostProfileSetupForm';

export default async function HostProfileSetupPage({params}:{params:Promise<{locale:string}>}){
  const {locale}=await params; const en=locale==='en';
  return <section className="hostOnboardingPage hostProfileSetupPage">
    <header><Link href={`/${locale}/vard/onboarding`} aria-label={en?'Back':'Tillbaka'}>‹</Link><span>{en?'Host profile':'Uthyrarprofil'}</span></header>
    <div className="hostOnboardingHero"><span>{en?'HOST PROFILE':'UTHYRARPROFIL'}</span><h1>{en?'Who are you renting out as?':'Vem hyr du ut som?'}</h1><p>{en?'Add your name and the pickup locations you want to use for your listings.':'Lägg in ditt namn och de utlämningsplatser du vill kunna använda för dina annonser.'}</p></div>
    <HostProfileSetupForm locale={locale}/>
  </section>;
}
