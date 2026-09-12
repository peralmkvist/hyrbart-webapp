import AuthForm from '@/components/AuthForm';

export default async function LoginPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const en = locale === 'en';
  return <section className="authPage">
    <div className="authShell">
      <div className="authLogo" aria-label="Hyrbart">Hyrbart</div>
      <span className="authEyebrow">{en ? 'Welcome' : 'Välkommen'}</span>
      <h1>{en ? 'Log in or create an account' : 'Logga in eller skapa konto'}</h1>
      <p className="authIntro">{en ? 'Use your email address. If you are new to Hyrbart, your account is created automatically.' : 'Använd din e-postadress. Är du ny på Hyrbart skapas ditt konto automatiskt.'}</p>
      <AuthForm locale={locale}/>
    </div>
  </section>;
}
