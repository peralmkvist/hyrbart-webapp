import Link from 'next/link';
import '../../../../profil/profile-menu.css';

export default async function HostRevenuePage({params}:{params:Promise<{locale:string}>}){
  const {locale}=await params; const en=locale==='en';
  return <section className="ds2Page profileSettingsPage">
    <header className="profileSubHeader"><Link href={`/topsecret/${locale}/vard/profil`} aria-label={en?'Back':'Tillbaka'}>‹</Link><h1>{en?'Revenue':'Intäkter'}</h1></header>
    <p className="profileSettingsIntro">{en?'This is the entry point for the host economy dashboard. Revenue, payouts, fees and tax-related summaries will be gathered here rather than on the profile or Insights pages.':'Det här är ingången till uthyrarens ekonomidashboard. Intäkter, utbetalningar, avgifter och skatterelaterade sammanställningar ska samlas här i stället för på profil- eller Insikter-sidan.'}</p>
    <section className="profileSettingsCard"><div className="profileSettingsCardHeading"><span>{en?'ECONOMY':'EKONOMI'}</span><h2>{en?'Economy dashboard':'Ekonomidashboard'}</h2></div><p>{en?'The dashboard itself is the next build step. No financial figures are shown elsewhere in the profile flow.':'Själva dashboarden byggs i nästa steg. Inga ekonomiska siffror visas på andra ställen i profilflödet.'}</p></section>
  </section>;
}
