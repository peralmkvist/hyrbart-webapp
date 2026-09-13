import Link from 'next/link';
import '../../profile-menu.css';

export default async function BlockedUsersPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const en = locale === 'en';
  return <section className="ds2Page profileSettingsPage">
    <header className="profileSubHeader"><Link href={`/topsecret/${locale}/profil/installningar`} aria-label={en ? 'Back' : 'Tillbaka'}>‹</Link><h1>{en ? 'Blocked users' : 'Blockerade användare'}</h1></header>
    <p className="profileSettingsIntro">{en ? 'People you block will be collected here so you can review or unblock them.' : 'Personer du blockerar samlas här så att du kan se dem och häva blockeringen.'}</p>
    <section className="profileSettingsCard profileEmptySettingsState">
      <div className="profileSettingsCardHeading"><span>{en ? 'SAFETY' : 'TRYGGHET'}</span><h2>{en ? 'No blocked users' : 'Inga blockerade användare'}</h2></div>
      <p>{en ? 'Blocking is not yet connected to the live messaging flow. This page is ready for the feature when that connection is added.' : 'Blockering är ännu inte kopplad till det aktiva meddelandeflödet. Sidan är förberedd för funktionen när den kopplingen läggs till.'}</p>
    </section>
  </section>;
}
