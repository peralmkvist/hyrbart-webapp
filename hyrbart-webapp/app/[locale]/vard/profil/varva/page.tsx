import Link from 'next/link';
import HostReferralForm from '@/components/HostReferralForm';
import '../../../profil/profile-menu.css';

export default async function HostReferralPage({params}:{params:Promise<{locale:string}>}){
  const {locale}=await params;
  const en=locale==='en';
  return <section className="ds2Page profileSettingsPage">
    <header className="profileSubHeader"><Link href={`/topsecret/${locale}/vard/profil`} aria-label={en?'Back':'Tillbaka'}>‹</Link><h1>{en?'Refer a host':'Värva en uthyrare'}</h1></header>
    <HostReferralForm locale={locale}/>
  </section>;
}
