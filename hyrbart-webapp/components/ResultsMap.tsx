type MapPrice = { key: string; label: string };

function zoomForRadius(radius: number) {
  if (radius <= 3) return 14;
  if (radius <= 7) return 13;
  if (radius <= 15) return 12;
  if (radius <= 30) return 11;
  return 10;
}

export default function ResultsMap({ place, radius, prices, locale }: { place: string; radius: number; prices: MapPrice[]; locale: string }) {
  const zoom = zoomForRadius(radius);
  const query = encodeURIComponent(`${place}, Sweden`);
  const src = `https://www.google.com/maps?q=${query}&z=${zoom}&output=embed&hl=${locale === 'en' ? 'en' : 'sv'}`;

  return (
    <section className="resultsMap2" aria-label={locale === 'en' ? 'Map of search results' : 'Karta över sökresultat'}>
      <iframe
        className="resultsMapFrame2"
        title={locale === 'en' ? `Map around ${place}` : `Karta runt ${place}`}
        src={src}
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
        allowFullScreen
      />
      {prices.slice(0, 5).map((price, index) => (
        <span key={price.key} className={`mapPrice2 m${index + 1}`}>{price.label}</span>
      ))}
    </section>
  );
}
