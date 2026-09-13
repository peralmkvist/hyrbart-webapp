import Link from 'next/link';
import '../../profil/profile-menu.css';

export default async function HostSettingsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const en = locale === 'en';
  const items = en ? [
    { title: 'Profile settings', copy: 'Manage the profile details shared between renting and hosting.', href: `/topsecret/${locale}/vard/profil/konto?back=vard` },
    { title: 'Verification & safety', copy: 'See the identity verification shared across both roles.', href: `/topsecret/${locale}/vard/profil/verifiering?back=vard` },
    { title: 'Pickup locations', copy: 'Manage the locations renters can use to collect your items.', href: `/topsecret/${locale}/vard/onboarding/profil` },
    { title: 'Payouts', copy: 'Manage the information used for payouts.', href: `/topsecret/${locale}/vard/onboarding/utbetalning` },
    { title: 'Automated messages', copy: 'Set up messages around your rentals.', href: `/topsecret/${locale}/vard/meddelanden/automatiserade` },
    { title: 'Import listings', copy: 'Bring listings into Hyrbart from another source.', href: `/topsecret/${locale}/vard/importera` },
    { title: 'Bookings and availability', copy: 'Review bookings and manage when your items are available.', href: `/topsecret/${locale}/vard` },
  ] : [
    { title: 'Profilinställningar', copy: 'Hantera profiluppgifter som delas mellan hyrar- och uthyrarläget.', href: `/topsecret/${locale}/vard/profil/konto?back=vard` },
    { title: 'Verifiering & trygghet', copy: 'Se identitetsverifieringen som delas mellan båda rollerna.', href: `/topsecret/${locale}/vard/profil/verifiering?back=vard` },
    { title: 'Utlämningsplatser', copy: 'Hantera platser där hyrare kan hämta dina saker.', href: `/topsecret/${locale}/vard/onboarding/profil` },
    { title: 'Utbetalningar', copy: 'Hantera uppgifterna som används för utbetalningar.', href: `/topsecret/${locale}/vard/onboarding/utbetalning` },
    { title: 'Automatiserade meddelanden', copy: 'Ställ in meddelanden kring dina uthyrningar.', href: `/topsecret/${locale}/vard/meddelanden/automatiserade` },
    { title: 'Importera annonser', copy: 'Ta in annonser till Hyrbart från en annan källa.', href: `/topsecret/${locale}/vard/importera` },
    { title: 'Bokningar och tillgänglighet', copy: 'Se bokningar och hantera när dina saker är tillgängliga.', href: `/topsecret/${locale}/vard` },
  ];

  return <section className="ds2Page profileSettingsPage">
    <header className="profileSubHeader"><Link href={`/topsecret/${locale}/vard/profil`} aria-label={en ? 'Back' : 'Tillbaka'}>‹</Link><h1>{en ? 'Host settings' : 'Uthyrarinställningar'}</h1></header>
    <p className="profileSettingsIntro">{en ? 'Everything that controls how you rent out through Hyrbart, gathered in one place.' : 'Allt som styr hur du hyr ut via Hyrbart, samlat på ett ställe.'}</p>
    <section className="profileSettingsCard profileSettingsLinkCard">
      {items.map(item => <Link className="profileSettingsLinkRow" href={item.href} key={item.href}>
        <span className="profileSettingsLinkCopy"><strong>{item.title}</strong><small>{item.copy}</small></span><span aria-hidden="true">›</span>
      </Link>)}
    </section>
  </section>;
}
