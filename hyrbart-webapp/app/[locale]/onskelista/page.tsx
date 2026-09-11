export default async function WishlistPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const en = locale === 'en';
  return <section className="ds2Page"><header className="ds2Header"><h1>{en ? 'Favorites' : 'Favoriter'}</h1></header><p className="ds2Intro">{en ? 'Saved products will appear here.' : 'Sparade produkter kommer att visas här.'}</p></section>;
}
