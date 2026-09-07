import Link from 'next/link';

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const en = locale === 'en';

  return (
    <div className="aboutLandingPage">
      <div className="aboutLandingBackdrop" aria-hidden="true" />

      <section className="aboutLandingContent">
        <div className="aboutLandingText">
          <h1>{en ? 'Welcome' : 'Välkommen hit'}</h1>

          <p>
            {en
              ? 'I’m a hands-on family man who likes high-quality products.'
              : 'Jag är en händig familjefar som gillar produkter med hög kvalitet.'}
          </p>

          <p>
            {en
              ? 'I rent out my machines and tools so they get used instead of gathering dust – and so you don’t have to buy expensive equipment for something you only need temporarily.'
              : 'Jag hyr ut mina maskiner och verktyg för att de ska användas istället för att samla damm – och för att du som behöver dem inte ska behöva köpa dyra maskiner för en tillfällig användning.'}
          </p>

          <p>
            {en
              ? 'I use all the products myself on a regular basis and reinvest the rental income in new equipment.'
              : 'Jag använder regelbundet alla produkter och återinvesterar intäkterna från uthyrningen i nya produkter.'}
          </p>

          <p>
            {en
              ? 'This site is here to make it easy to rent and understand how to use the products in the best possible way.'
              : 'Den här sidan är till för att göra det enkelt att hyra och förstå hur man använder produkterna på bästa sätt.'}
          </p>

          <p className="aboutLandingStatement">
            {en
              ? 'What you need, but only when you need it.'
              : 'Det du behöver, men bara när du behöver det.'}
          </p>

          <Link className="primaryButton aboutLandingCta" href={`/${locale}/produkter`}>
            <span>{en ? 'See all my rental items' : 'Se alla mina hyresobjekt'}</span>
            <span aria-hidden="true">→</span>
          </Link>
        </div>
      </section>
    </div>
  );
}
