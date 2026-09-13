import Link from 'next/link';
import '../profile-menu.css';

export default async function HelpPage({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<{ back?: string }> }) {
  const { locale } = await params;
  const { back } = await searchParams;
  const en = locale === 'en';
  const backHref = back === 'vard' ? `/topsecret/${locale}/vard/profil` : `/topsecret/${locale}/profil`;

  return <section className="ds2Page profileSettingsPage">
    <header className="profileSubHeader"><Link href={backHref} aria-label={en ? 'Back' : 'Tillbaka'}>‹</Link><h1>{en ? 'Get help' : 'Få hjälp'}</h1></header>
    <p className="profileSettingsIntro">{en ? 'Quick answers and the right way into the parts of Hyrbart that can resolve common issues.' : 'Snabba svar och rätt väg in till de delar av Hyrbart som kan lösa vanliga problem.'}</p>

    <section className="profileSettingsCard">
      <div className="profileSettingsCardHeading"><span>{en ? 'BOOKINGS' : 'BOKNINGAR'}</span><h2>{en ? 'Something happened during a rental' : 'Något har hänt under en hyra'}</h2></div>
      <p>{en ? 'Open the relevant booking first. There you can use the booking message thread and, when available, open a case and attach documentation.' : 'Öppna först den aktuella bokningen. Där finns bokningens meddelandetråd och, när funktionen är tillgänglig, möjlighet att öppna ett ärende och bifoga underlag.'}</p>
      <Link className="profileSettingsTextLink" href={`/topsecret/${locale}/kalender`}>{en ? 'Go to bookings' : 'Gå till bokningar'} <span>›</span></Link>
    </section>

    <section className="profileSettingsCard">
      <div className="profileSettingsCardHeading"><span>{en ? 'COMMON QUESTIONS' : 'VANLIGA FRÅGOR'}</span><h2>{en ? 'About your account' : 'Om ditt konto'}</h2></div>
      <div className="profileFaqList">
        <details><summary>{en ? 'How do I change language?' : 'Hur byter jag språk?'}</summary><p>{en ? 'Use the Language dropdown directly on the profile page. The selected language is saved to your profile.' : 'Använd dropdown-menyn Språk direkt på profilsidan. Det valda språket sparas till din profil.'}</p></details>
        <details><summary>{en ? 'How do push notifications work?' : 'Hur fungerar pushnotiser?'}</summary><p>{en ? 'Turn them on from the profile page. Your browser may also ask for permission. If the browser does not support web push, the option is shown as unavailable.' : 'Aktivera dem från profilsidan. Webbläsaren kan också be om tillåtelse. Om webbläsaren inte stöder webbpush visas alternativet som ej tillgängligt.'}</p></details>
        <details><summary>{en ? 'Can I bring reviews from another platform?' : 'Kan jag ta med omdömen från en annan plattform?'}</summary><p>{en ? 'You can submit a public profile for verification. External history stays separate from reviews earned on Hyrbart and is only displayed as verified after Hyrbart has checked it.' : 'Du kan skicka in en offentlig profil för verifiering. Extern historik hålls separat från omdömen du fått på Hyrbart och visas som verifierad först efter att Hyrbart har kontrollerat den.'}</p></details>
      </div>
    </section>

    <section className="profileSettingsCard profileSettingsLinkCard">
      <Link className="profileSettingsLinkRow" href={`/topsecret/${locale}/hyresvillkor`}><span className="profileSettingsLinkCopy"><strong>{en ? 'Rental terms' : 'Allmänna villkor'}</strong><small>{en ? 'Read the terms that apply to bookings.' : 'Läs villkoren som gäller för bokningar.'}</small></span><span>›</span></Link>
      <Link className="profileSettingsLinkRow" href={`/topsecret/${locale}/profil/sekretess${back === 'vard' ? '?back=vard' : ''}`}><span className="profileSettingsLinkCopy"><strong>{en ? 'Privacy' : 'Sekretess'}</strong><small>{en ? 'See what information Hyrbart uses in the product.' : 'Se vilka uppgifter Hyrbart använder i produkten.'}</small></span><span>›</span></Link>
    </section>
  </section>;
}
