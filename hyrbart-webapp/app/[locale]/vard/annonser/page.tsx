export default async function HostListingsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const en = locale === 'en';
  return <section className="ds2Page"><header className="ds2Header"><h1>{en ? 'Listings' : 'Annonser'}</h1></header><p className="ds2Intro">{en ? 'Your rental listings will appear here.' : 'Dina uthyrningsannonser kommer att visas här.'}</p></section>;
}
