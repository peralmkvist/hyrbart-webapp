export default async function HostMessagesPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const en = locale === 'en';
  return <section className="ds2Page"><header className="ds2Header"><h1>{en ? 'Messages' : 'Meddelanden'}</h1></header><p className="ds2Intro">{en ? 'Messages from renters will appear here.' : 'Meddelanden från hyrestagare kommer att visas här.'}</p></section>;
}
