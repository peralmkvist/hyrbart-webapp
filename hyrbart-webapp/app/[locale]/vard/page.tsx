export default async function HostCalendarPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const en = locale === 'en';
  return <section className="ds2Page"><header className="ds2Header"><h1>{en ? 'Calendar' : 'Kalender'}</h1></header><p className="ds2Intro">{en ? 'Bookings and availability will be managed here.' : 'Bokningar och tillgänglighet kommer att hanteras här.'}</p></section>;
}
