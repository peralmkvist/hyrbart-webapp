import Link from 'next/link';
import { redirect } from 'next/navigation';
import PrivacyConsentSettings from '@/components/PrivacyConsentSettings';
import { createClient } from '@/lib/supabase/server';
import '../profile-menu.css';

export default async function PrivacyPage({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<{ back?: string }> }) {
  const { locale } = await params;
  const { back } = await searchParams;
  const en = locale === 'en';
  const backHref = back === 'vard' ? `/topsecret/${locale}/vard/profil` : `/topsecret/${locale}/profil`;
  const supabase=await createClient();
  const {data:{user}}=await supabase.auth.getUser();
  if(!user) redirect(`/topsecret/${locale}/logga-in?next=${encodeURIComponent(`/topsecret/${locale}/profil/sekretess`)}`);

  return <section className="ds2Page profileSettingsPage">
    <header className="profileSubHeader"><Link href={backHref} aria-label={en ? 'Back' : 'Tillbaka'}>‹</Link><h1>{en ? 'Privacy' : 'Sekretess'}</h1></header>
    <p className="profileSettingsIntro">{en ? 'Control optional data use and find the tools for your personal data. Processing required for bookings, payments, security or legal obligations is kept separate from consent.' : 'Styr valfri användning av data och hitta verktygen för dina personuppgifter. Behandling som krävs för bokningar, betalningar, säkerhet eller rättsliga skyldigheter hålls separat från samtycken.'}</p>

    <section className="profileSettingsCard">
      <div className="profileSettingsCardHeading"><span>{en ? 'YOUR CHOICES' : 'DINA VAL'}</span><h2>{en ? 'Optional consent' : 'Valfria samtycken'}</h2></div>
      <PrivacyConsentSettings locale={locale}/>
    </section>

    <section className="profileSettingsCard">
      <div className="profileSettingsCardHeading"><span>{en ? 'COOKIES' : 'COOKIES'}</span><h2>{en ? 'Cookie settings' : 'Cookieinställningar'}</h2></div>
      <p>{en ? 'See which cookies are necessary for sign-in and security and how optional browser storage will be handled.' : 'Se vilka cookies som krävs för inloggning och säkerhet och hur valfri lagring i webbläsaren ska hanteras.'}</p>
      <Link className="profilePrimaryAction" href={`/topsecret/${locale}/profil/sekretess/cookies`}>{en?'Open cookie settings':'Öppna cookieinställningar'}</Link>
    </section>

    <section className="profileSettingsCard">
      <div className="profileSettingsCardHeading"><span>{en ? 'PERSONAL DATA' : 'PERSONUPPGIFTER'}</span><h2>{en ? 'How Hyrbart uses your information' : 'Så använder Hyrbart dina uppgifter'}</h2></div>
      <p>{en ? 'Read about categories of data, purposes, rights and the contact path for privacy questions.' : 'Läs om datakategorier, ändamål, rättigheter och kontaktväg för frågor om personuppgifter.'}</p>
      <Link className="profilePrimaryAction" href={`/topsecret/${locale}/profil/sekretess/personuppgifter`}>{en?'Personal data information':'Personuppgiftshantering'}</Link>
    </section>

    <section className="profileSettingsCard">
      <div className="profileSettingsCardHeading"><span>{en ? 'YOUR DATA' : 'DINA DATA'}</span><h2>{en ? 'Export and account deletion' : 'Export och kontoradering'}</h2></div>
      <p>{en ? 'Download a JSON copy of the data connected to your signed-in account. The file is generated for your current authenticated session and is not cached.' : 'Ladda ner en JSON-kopia av de uppgifter som är kopplade till ditt inloggade konto. Filen skapas för din aktuella autentiserade session och cachas inte.'}</p>
      <div style={{display:'grid',gap:10}}>
        <a className="profilePrimaryAction" href="/api/account/export" download>{en?'Download your data':'Ladda ner dina data'}</a>
        <Link className="profilePrimaryAction" href={`/topsecret/${locale}/profil/sekretess/radera-konto`}>{en?'Delete my account':'Ta bort mig som användare'}</Link>
      </div>
    </section>

    <section className="profileSettingsCard profilePrivacyNotice">
      <strong>{en ? 'Necessary processing is not consent' : 'Nödvändig behandling är inte samtycke'}</strong>
      <p>{en ? 'Hyrbart must still process information needed to provide a rental, secure the service, handle payments and comply with legal obligations even if every optional choice above is off.' : 'Hyrbart behöver fortfarande behandla uppgifter som krävs för att genomföra en uthyrning, skydda tjänsten, hantera betalningar och följa rättsliga skyldigheter även om alla valfria val ovan är avstängda.'}</p>
    </section>
  </section>;
}
