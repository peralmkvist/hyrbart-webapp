import Link from 'next/link';
import { redirect } from 'next/navigation';
import UserSecuritySettings from '@/components/UserSecuritySettings';
import { createClient } from '@/lib/supabase/server';
import '../../../profil/profile-menu.css';

export default async function SecurityPage({params}:{params:Promise<{locale:string}>}){
  const {locale}=await params;
  const en=locale==='en';
  const supabase=await createClient();
  const {data:{user}}=await supabase.auth.getUser();
  if(!user)redirect(`/topsecret/${locale}/logga-in`);
  const {data:profile}=await supabase.from('profiles').select('bankid_verified,identity_verification_status,identity_verification_provider,identity_verified_at').eq('id',user.id).maybeSingle();
  const verified=Boolean(profile?.bankid_verified||profile?.identity_verification_status==='verified');
  const pending=profile?.identity_verification_status==='pending';
  const failed=profile?.identity_verification_status==='failed'||profile?.identity_verification_status==='revoked';
  const status=verified?(en?'Verified':'Verifierad'):pending?(en?'Pending':'Pågår'):failed?(en?'Needs action':'Kräver åtgärd'):(en?'Not verified':'Inte verifierad');
  return <section className="ds2Page profileSettingsPage">
    <header className="profileSubHeader"><Link href={`/topsecret/${locale}/vard/profil`} aria-label={en?'Back':'Tillbaka'}>‹</Link><h1>{en?'Security':'Säkerhet'}</h1></header>
    <p className="profileSettingsIntro">{en?'Identity verification, two-factor authentication and session security for your Hyrbart account.':'Identitetsverifiering, tvåstegsautentisering och sessionssäkerhet för ditt Hyrbart-konto.'}</p>
    <section className="profileSettingsCard"><div className="profileSettingsCardHeading"><span>{en?'IDENTITY':'IDENTITET'}</span><h2>{status}</h2></div><p>{verified?(en?`Verified${profile?.identity_verification_provider?` via ${profile.identity_verification_provider}`:''}${profile?.identity_verified_at?` on ${new Date(profile.identity_verified_at).toLocaleDateString('en-GB')}`:''}.`:`Verifierad${profile?.identity_verification_provider?` via ${profile.identity_verification_provider}`:''}${profile?.identity_verified_at?` ${new Date(profile.identity_verified_at).toLocaleDateString('sv-SE')}`:''}.`):(en?'BankID integration is handled by the identity-verification flow. This page only displays server-side status and cannot change it locally.':'BankID-integrationen hanteras av identitetsverifieringsflödet. Den här sidan visar endast serverns status och kan inte ändra den lokalt.')}</p><Link className="profileSettingsTextLink" href={`/topsecret/${locale}/vard/profil/verifiering`}>{en?'Open identity verification':'Öppna identitetsverifiering'} <span>›</span></Link></section>
    <UserSecuritySettings locale={locale}/>
  </section>;
}
