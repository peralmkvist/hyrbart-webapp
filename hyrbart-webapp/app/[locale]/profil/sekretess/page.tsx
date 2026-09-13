import Link from 'next/link';
import '../profile-menu.css';

export default async function PrivacyPage({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<{ back?: string }> }) {
  const { locale } = await params;
  const { back } = await searchParams;
  const en = locale === 'en';
  const backHref = back === 'vard' ? `/topsecret/${locale}/vard/profil` : `/topsecret/${locale}/profil`;

  return <section className="ds2Page profileSettingsPage">
    <header className="profileSubHeader"><Link href={backHref} aria-label={en ? 'Back' : 'Tillbaka'}>‹</Link><h1>{en ? 'Privacy' : 'Sekretess'}</h1></header>
    <p className="profileSettingsIntro">{en ? 'An overview of information currently used by Hyrbart features. This is product information, not a final legal privacy policy.' : 'En översikt över information som Hyrbarts nuvarande funktioner använder. Detta är produktinformation, inte en slutlig juridisk integritetspolicy.'}</p>

    <section className="profileSettingsCard">
      <div className="profileSettingsCardHeading"><span>{en ? 'YOUR ACCOUNT' : 'DITT KONTO'}</span><h2>{en ? 'Profile and account details' : 'Profil- och kontouppgifter'}</h2></div>
      <p>{en ? 'Hyrbart uses account and profile details such as your email address, display name, city and profile image to provide your account and profile.' : 'Hyrbart använder konto- och profiluppgifter som e-postadress, visningsnamn, ort och profilbild för att tillhandahålla ditt konto och din profil.'}</p>
    </section>

    <section className="profileSettingsCard">
      <div className="profileSettingsCardHeading"><span>{en ? 'USING HYRBART' : 'NÄR DU ANVÄNDER HYRBART'}</span><h2>{en ? 'Bookings, messages and activity' : 'Bokningar, meddelanden och aktivitet'}</h2></div>
      <p>{en ? 'Features for bookings, payments, messages, reviews and issue handling use the information connected to those actions so the rental flow can work.' : 'Funktioner för bokningar, betalningar, meddelanden, omdömen och ärendehantering använder de uppgifter som hör till respektive aktivitet för att hyresflödet ska fungera.'}</p>
    </section>

    <section className="profileSettingsCard">
      <div className="profileSettingsCardHeading"><span>{en ? 'OPTIONAL FEATURES' : 'VALFRIA FUNKTIONER'}</span><h2>{en ? 'Location, push and external history' : 'Plats, push och extern historik'}</h2></div>
      <p>{en ? 'Location search can use location information when you choose that feature. Push notifications require a browser push subscription. If you submit history from another platform, the public profile URL and the information submitted for verification are stored with that request.' : 'Platssökning kan använda platsinformation när du väljer den funktionen. Pushnotiser kräver en pushprenumeration i webbläsaren. Om du skickar in historik från en annan plattform sparas den offentliga profillänken och de uppgifter som skickas in för verifiering tillsammans med begäran.'}</p>
    </section>

    <section className="profileSettingsCard profilePrivacyNotice">
      <strong>{en ? 'Before public launch' : 'Inför publik lansering'}</strong>
      <p>{en ? 'A complete privacy policy should be legally reviewed and specify purposes, legal bases, recipients, retention periods and user rights before Hyrbart is launched publicly.' : 'En fullständig integritetspolicy bör juridiskt granskas och ange ändamål, rättsliga grunder, mottagare, lagringstider och användarrättigheter innan Hyrbart lanseras publikt.'}</p>
    </section>
  </section>;
}
