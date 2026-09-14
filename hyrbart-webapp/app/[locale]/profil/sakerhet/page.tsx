import Link from 'next/link';
import { redirect } from 'next/navigation';
import UserSecuritySettings from '@/components/UserSecuritySettings';
import { createClient } from '@/lib/supabase/server';
import '../profile-menu.css';

export default async function SecurityPage({params}:{params:Promise<{locale:string}>}){
  const {locale}=await params; const en=locale==='en'; const supabase=await createClient(); const {data:{user}}=await supabase.auth.getUser();
  if(!user)redirect(`/topsecret/${locale}/logga-in`);
  const {data:profile}=await supabase.from('profiles').select('bankid_verified,identity_verification_status,identity_verification_provider,identity_verified_at').eq('id',user.id).maybeSingle();
  const raw=String(profile?.identity_verification_status||'unverified');
  const verified=Boolean(profile?.bankid_verified||raw==='verified');
  const labels:Record<string,string>=en?{unverified:'Not verified',pending:'Verification in progress',verified:'Verified',failed:'Verification failed',cancelled:'Verification cancelled',review_required:'Needs review',revoked:'Verification revoked'}:{unverified:'Inte verifierad',pending:'Verifiering pågår',verified:'Verifierad',failed:'Verifieringen misslyckades',cancelled:'Verifieringen avbröts',review_required:'Behöver granskas',revoked:'Verifieringen är återkallad'};
  const status=labels[verified?'verified':raw]||labels.unverified;
  return <section className="ds2Page profileSettingsPage"><header className="profileSubHeader"><Link href={`/topsecret/${locale}/profil`} aria-label={en?'Back':'Tillbaka'}>‹</Link><h1>{en?'Security':'Säkerhet'}</h1></header><p className="profileSettingsIntro">{en?'Identity verification, two-factor authentication and session security for your Hyrbart account.':'Identitetsverifiering, tvåstegsautentisering och sessionssäkerhet för ditt Hyrbart-konto.'}</p><section className="profileSettingsCard"><div className="profileSettingsCardHeading"><span>{en?'IDENTITY':'IDENTITET'}</span><h2>{status}</h2></div><p>{verified?(en?`Verified${profile?.identity_verification_provider?` via ${profile.identity_verification_provider}`:''}.`:`Verifierad${profile?.identity_verification_provider?` via ${profile.identity_verification_provider}`:''}.`):(en?'Verification state comes only from server-controlled data. Open the verification flow for the relevant next step.':'Verifieringsstatus kommer endast från serverstyrd data. Öppna verifieringsflödet för relevant nästa steg.')}</p><Link className="profileSettingsTextLink" href={`/topsecret/${locale}/profil/verifiering`}>{en?'Open identity verification':'Öppna identitetsverifiering'} <span>›</span></Link></section><UserSecuritySettings locale={locale}/></section>;
}
