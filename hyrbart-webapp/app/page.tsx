import Link from 'next/link';
import { ArrowIcon } from '@/components/Icons';

export default function HomePage() {
  return <div className="homePage">
    <section className="hero">
      <div className="heroContent">
        <h1>
          <span className="heroLine heroLinePrimary">Det du behöver.</span>
          <span className="heroLine heroLineAccent">När du behöver det.</span>
        </h1>
        <p>Hyr verktyg, maskiner och utrustning för hemmet, resan och nästa projekt.</p>
        <Link className="primaryButton" href="/produkter">Utforska produkter <ArrowIcon /></Link>
      </div>
    </section>
    <section className="aboutCard">
      <div className="avatar">P</div>
      <div>
        <h2>Hej, jag heter Per.</h2>
        <p>Jag hyr ut maskiner och verktyg för att fler ska kunna förverkliga sina projekt – utan att behöva köpa dyr utrustning.</p>
        <p>Hyrbart är min samling guider, tips och instruktioner som gör det enkelt att hyra och använda rätt utrustning.</p>
      </div>
    </section>
  </div>;
}
