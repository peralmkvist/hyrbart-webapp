import UserMfaChallenge from '@/components/UserMfaChallenge';

export default async function MfaPage({params}:{params:Promise<{locale:string}>}){
  const {locale}=await params;
  const en=locale==='en';
  return <section className="authPage"><div className="authShell"><div className="authLogo" aria-label="Hyrbart">Hyrbart</div><span className="authEyebrow">2FA</span><h1>{en?'Verify your sign-in':'Verifiera din inloggning'}</h1><p className="authIntro">{en?'Enter the code from your authenticator app to continue.':'Ange koden från din autentiseringsapp för att fortsätta.'}</p><UserMfaChallenge locale={locale}/></div></section>;
}
