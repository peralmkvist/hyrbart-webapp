import Link from 'next/link';
import '../../profile-menu.css';

export default async function CookieSettingsPage({params}:{params:Promise<{locale:string}>}){
 const {locale}=await params;const en=locale==='en';
 return <section className="ds2Page profileSettingsPage">
  <header className="profileSubHeader"><Link href={`/topsecret/${locale}/profil/sekretess`} aria-label={en?'Back':'Tillbaka'}>‹</Link><h1>{en?'Cookie settings':'Cookieinställningar'}</h1></header>
  <p className="profileSettingsIntro">{en?'Hyrbart currently uses first-party cookies needed for sign-in, security and remembering essential preferences such as language. These cannot be disabled while using the signed-in service.':'Hyrbart använder i nuläget förstapartscookies som krävs för inloggning, säkerhet och nödvändiga preferenser som språk. De kan inte stängas av när den inloggade tjänsten används.'}</p>
  <section className="profileSettingsCard"><div className="profileSettingsCardHeading"><span>{en?'NECESSARY':'NÖDVÄNDIGA'}</span><h2>{en?'Sign-in, security and language':'Inloggning, säkerhet och språk'}</h2></div><p>{en?'Session cookies keep you signed in securely. Hyrbart also stores the selected language so the correct locale can be restored in a later session.':'Sessionscookies håller dig säkert inloggad. Hyrbart lagrar också valt språk så att rätt språkversion kan återställas i en senare session.'}</p></section>
  <section className="profileSettingsCard"><div className="profileSettingsCardHeading"><span>{en?'OPTIONAL':'VALFRIA'}</span><h2>{en?'Analytics and marketing storage':'Analys- och marknadsföringslagring'}</h2></div><p>{en?'No optional analytics or marketing cookie category is activated by this screen today. If Hyrbart introduces such browser storage, it must be connected to the corresponding choices on the Privacy page before activation.':'Ingen valfri kategori för analys- eller marknadsföringscookies aktiveras av den här sidan idag. Om Hyrbart inför sådan lagring i webbläsaren måste den kopplas till motsvarande val på Sekretess-sidan innan aktivering.'}</p></section>
 </section>
}
