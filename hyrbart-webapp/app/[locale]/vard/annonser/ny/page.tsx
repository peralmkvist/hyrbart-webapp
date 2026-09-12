export default async function NewListingPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const en = locale === 'en';

  return (
    <section className="hostListingsPage">
      <header className="hostListingsHeader">
        <div>
          <h1>{en ? 'What do you want to rent out?' : 'Vad vill du hyra ut?'}</h1>
        </div>
      </header>
      <div className="newListingPlaceholder">
        <h2>{en ? 'Listing flow coming next' : 'Annonsflödet bygger vi härnäst'}</h2>
        <p>{en ? 'This page is ready for photos, category, title, description, pricing and availability.' : 'Den här sidan är förberedd för bilder, kategori, rubrik, beskrivning, pris och tillgänglighet.'}</p>
      </div>
    </section>
  );
}
