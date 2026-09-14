import Link from 'next/link';
import RentalRulesSettings from '@/components/RentalRulesSettings';
import '../../../profil/profile-menu.css';

export default async function RentalRulesPage({params}:{params:Promise<{locale:string}>}){
  const {locale}=await params; const en=locale==='en';
  return <section className="ds2Page profileSettingsPage">
    <header className="profileSubHeader"><Link href={`/topsecret/${locale}/vard/installningar`} aria-label={en?'Back':'Tillbaka'}>‹</Link><h1>{en?'Rental rules':'Uthyrningsregler'}</h1></header>
    <p className="profileSettingsIntro">{en?'Set the shortest and longest rental you accept and how much time you need between bookings. Rules are set per listing.':'Ställ in kortaste och längsta uthyrning du accepterar och hur mycket tid du behöver mellan bokningar. Reglerna sätts per annons.'}</p>
    <section className="profileSettingsCard" style={{padding:18}}><RentalRulesSettings locale={locale}/></section>
  </section>;
}
