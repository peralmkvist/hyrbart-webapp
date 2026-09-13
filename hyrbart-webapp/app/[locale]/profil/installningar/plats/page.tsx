import Link from 'next/link';
import DefaultSearchLocationSetting from '@/components/DefaultSearchLocationSetting';
import '../../profile-menu.css';

export default async function DefaultLocationPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const en = locale === 'en';
  return <section className="ds2Page profileSettingsPage">
    <header className="profileSubHeader"><Link href={`/topsecret/${locale}/profil/installningar`} aria-label={en ? 'Back' : 'Tillbaka'}>‹</Link><h1>{en ? 'Default search location' : 'Standardplats för sökning'}</h1></header>
    <p className="profileSettingsIntro">{en ? 'Use this place and radius as the starting point for new searches. You can always change them in the search field.' : 'Använd platsen och radien som utgångspunkt för nya sökningar. Du kan alltid ändra dem direkt i sökfältet.'}</p>
    <section className="profileSettingsCard"><DefaultSearchLocationSetting locale={locale} /></section>
  </section>;
}
