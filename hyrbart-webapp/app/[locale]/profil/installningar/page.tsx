import Link from 'next/link';
import '../profile-menu.css';

export default async function RenterSettingsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const en = locale === 'en';
  const items = en ? [
    { title: 'Profile settings', copy: 'Manage the profile details shared between renting and hosting.', href: `/topsecret/${locale}/profil/konto` },
    { title: 'Payment settings', copy: 'Payment methods and payment-related preferences for rentals.', href: `/topsecret/${locale}/profil/installningar/betalning` },
    { title: 'Default search location', copy: 'Choose the place and radius used when you start a new search.', href: `/topsecret/${locale}/profil/installningar/plats` },
    { title: 'Verification & safety', copy: 'See your identity verification status and Hyrbart safety information.', href: `/topsecret/${locale}/profil/verifiering` },
    { title: 'Blocked users', copy: 'See and manage people you have blocked.', href: `/topsecret/${locale}/profil/installningar/blockerade` },
  ] : [
    { title: 'Profilinställningar', copy: 'Hantera profiluppgifter som delas mellan hyrar- och uthyrarläget.', href: `/topsecret/${locale}/profil/konto` },
    { title: 'Betalningsinställningar', copy: 'Betalmetoder och betalningsrelaterade inställningar för hyror.', href: `/topsecret/${locale}/profil/installningar/betalning` },
    { title: 'Standardplats för sökning', copy: 'Välj plats och radie som används när du startar en ny sökning.', href: `/topsecret/${locale}/profil/installningar/plats` },
    { title: 'Verifiering & trygghet', copy: 'Se status för identitetsverifiering och Hyrbarts trygghetsfunktioner.', href: `/topsecret/${locale}/profil/verifiering` },
    { title: 'Blockerade användare', copy: 'Se och hantera personer som du har blockerat.', href: `/topsecret/${locale}/profil/installningar/blockerade` },
  ];

  return <section className="ds2Page profileSettingsPage">
    <header className="profileSubHeader"><Link href={`/topsecret/${locale}/profil`} aria-label={en ? 'Back' : 'Tillbaka'}>‹</Link><h1>{en ? 'Renter settings' : 'Hyrarinställningar'}</h1></header>
    <p className="profileSettingsIntro">{en ? 'Settings that affect how you rent through Hyrbart.' : 'Inställningar som påverkar hur du hyr via Hyrbart.'}</p>
    <section className="profileSettingsCard profileSettingsLinkCard">
      {items.map(item => <Link className="profileSettingsLinkRow" href={item.href} key={item.href}>
        <span className="profileSettingsLinkCopy"><strong>{item.title}</strong><small>{item.copy}</small></span><span aria-hidden="true">›</span>
      </Link>)}
    </section>
  </section>;
}
