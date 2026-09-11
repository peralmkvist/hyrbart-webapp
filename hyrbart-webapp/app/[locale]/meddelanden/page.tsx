export default async function MessagesPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const en = locale === 'en';
  return <section className="ds2Page"><header className="ds2Header"><h1>{en ? 'Messages' : 'Meddelanden'}</h1></header><p className="ds2Intro">{en ? 'Conversations with renters and hosts will appear here.' : 'Konversationer kring uthyrningar kommer att visas här.'}</p></section>;
}
