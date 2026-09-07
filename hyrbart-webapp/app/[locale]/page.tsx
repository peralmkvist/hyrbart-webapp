import Link from 'next/link';

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const en = locale === 'en';
  return (
    <div className="homePage">
      <section className="hero">
        <div className="heroContent">
          <h1><span className="heroLine heroLinePrimary">{en ? 'What you need.' : 'Det du behöver.'}</span><span className="heroLine heroLineAccent">{en ? 'When you need it.' : 'När du behöver det.'}</span></h1>
          <p>{en ? 'Rent tools, machines and equipment for your home, journey and next project.' : 'Hyr verktyg, maskiner och utrustning för hemmet, resan och nästa projekt.'}</p>
          <Link className="primaryButton" href={`/${locale}/produkter`}>{en ? 'Explore products' : 'Utforska produkter'}</Link>
        </div>
      </section>
      <section className="aboutCard">
        <div className="avatar">P</div>
        <div>
          <h2>{en ? 'Hi, I’m Per.' : 'Hej, jag heter Per.'}</h2>
          <p>{en ? 'I rent out machines and tools so more people can complete their projects without having to buy expensive equipment.' : 'Jag hyr ut maskiner och verktyg för att fler ska kunna förverkliga sina projekt – utan att behöva köpa dyr utrustning.'}</p>
          <p>{en ? 'Hyrbart is my collection of guides, tips and instructions that make it easy to rent and use the right equipment.' : 'Hyrbart är min samling guider, tips och instruktioner som gör det enkelt att hyra och använda rätt utrustning.'}</p>
        </div>
      </section>
    </div>
  );
}
