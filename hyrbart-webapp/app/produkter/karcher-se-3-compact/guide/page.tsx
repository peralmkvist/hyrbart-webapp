'use client';

import Link from 'next/link';
import { use, useEffect, useState } from 'react';
import { BackIcon, InfoIcon } from '@/components/Icons';

const ids = ['kom-igang', 'anvandning', 'vanliga-fel', 'aterlamning'];

export default function GuidePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = use(params);
  const en = locale === 'en';

  const sections = ids.map((id, i) => ({
    id,
    label: (en
      ? ['Get started', 'Use', 'Common issues', 'Return']
      : ['Kom igång', 'Användning', 'Vanliga fel', 'Återlämning'])[i],
  }));

  const [activeSection, setActiveSection] = useState('kom-igang');

  useEffect(() => {
    const update = () => {
      let current = ids[0];

      for (const id of ids) {
        const el = document.getElementById(id);
        if (el && el.getBoundingClientRect().top <= 205) current = id;
        else if (el) break;
      }

      setActiveSection(current);
    };

    const applyHash = () => {
      const hash = window.location.hash.slice(1);

      if (ids.includes(hash)) {
        setActiveSection(hash);
        requestAnimationFrame(() => {
          document.getElementById(hash)?.scrollIntoView();
        });
      }
    };

    applyHash();
    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    window.addEventListener('hashchange', applyHash);

    return () => {
      window.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
      window.removeEventListener('hashchange', applyHash);
    };
  }, []);

  return (
    <div className="guidePage pageShell">
      <div className="guideHeaderSticky">
        <Link
          href={`/${locale}/produkter/karcher-se-3-compact`}
          className="guideBackRow"
        >
          <BackIcon />
          <span>{en ? 'Back to product page' : 'Tillbaka till produktsidan'}</span>
        </Link>

        <div className="guideCategoryRow">
          {en ? 'User guide' : 'Användarguide'}
        </div>

        <header className="guideIdentityRow">
          <h1>
            <span>KÄRCHER</span>
            <span>SE 3 COMPACT</span>
          </h1>
        </header>

        <nav className="guideTabs" aria-label={en ? 'Guide sections' : 'Guideavsnitt'}>
          {sections.map((section) => (
            <a
              key={section.id}
              href={`#${section.id}`}
              className={activeSection === section.id ? 'active' : ''}
              aria-current={activeSection === section.id ? 'location' : undefined}
              onClick={() => setActiveSection(section.id)}
            >
              {section.label}
            </a>
          ))}
        </nav>
      </div>

      <section id="kom-igang" className="guideSection">
        <div className="stepHeading">
          <span>1</span>
          <h1>{en ? 'Get the machine ready' : 'Gör maskinen klar'}</h1>
        </div>

        <p>
          {en
            ? 'One dose of cleaning solution is already in the clean-water tank when you receive the machine. Fill only with warm water up to the marked line.'
            : 'En dos rengöringsmedel finns redan i renvattentanken när du får maskinen. Fyll endast på varmt vatten upp till markeringen.'}
        </p>

        <div className="guideTextCard">
          <strong>{en ? 'Two separate tanks' : 'Två separata tankar'}</strong>
          <p>
            {en
              ? 'The machine has one tank for clean water and detergent, and one separate tank for dirty water.'
              : 'Maskinen har en tank för rent vatten och rengöringsmedel och en separat tank för smutsvattnet.'}
          </p>
        </div>

        <div className="infoBox">
          <InfoIcon />
          <div>
            <b>{en ? 'IMPORTANT' : 'VIKTIGT'}</b>
            <p>
              {en
                ? 'Do not add another dose for the first fill.'
                : 'Tillsätt inte ytterligare rengöringsmedel vid första fyllningen.'}
            </p>
          </div>
        </div>
      </section>

      <section id="anvandning" className="guideSection">
        <div className="stepHeading">
          <span>2</span>
          <h2>{en ? 'Use the machine' : 'Använd maskinen'}</h2>
        </div>

        <p>
          {en
            ? 'Plug the power cable into the wall and switch the machine on. The suction then runs continuously. Hold the trigger on the handle when you want to spray cleaning solution.'
            : 'Sätt strömkabeln i vägguttaget och slå på maskinen. Då går suget kontinuerligt. Håll in avtryckaren på handtaget när du vill spraya rengöringsvätska.'}
        </p>

        <div className="guideTextCard">
          <strong>{en ? 'Pretreating a stain' : 'Förbehandla en fläck'}</strong>
          <p>
            {en
              ? 'The spray cannot be used without the suction running. To pretreat, lift the nozzle away from the surface and spray the material from about 5–10 cm away.'
              : 'Sprayfunktionen kan inte köras utan att suget samtidigt är igång. Vid förbehandling lyfter du därför munstycket från ytan och sprayar materialet från cirka 5–10 cm avstånd.'}
          </p>
        </div>

        <div className="guideTextCard">
          <strong>{en ? 'Extra detergent' : 'Extra rengöringsmedel'}</strong>
          <p>
            {en
              ? 'Four extra dose bottles are supplied. Any extra dose used is charged at SEK 20 per dose when the machine is returned.'
              : 'Fyra extra dosflaskor följer med. Använd extra dos vid behov; använd mängd debiteras med 20 kr per dos vid återlämning.'}
          </p>
        </div>
      </section>

      <section id="vanliga-fel" className="guideSection">
        <div className="stepHeading">
          <span>3</span>
          <h2>{en ? 'When the dirty-water tank is full' : 'När smutsvattentanken är full'}</h2>
        </div>

        <p>
          {en
            ? 'When the dirty-water tank is full, a sensor can make the machine sound as if a vacuum nozzle is stuck to a dense surface. The sound usually increases in intensity.'
            : 'När smutsvattentanken är full kan en sensor göra att maskinen låter ungefär som när ett dammsugarmunstycke fastnar mot ett tätt material. Ljudet brukar öka i intensitet.'}
        </p>

        <div className="guideTextCard">
          <strong>{en ? 'It can happen before the tank looks completely full' : 'Det kan hända innan tanken ser helt full ut'}</strong>
          <p>
            {en
              ? 'Switch the machine off and on again once. If the sound remains, empty the dirty-water tank before continuing.'
              : 'Stäng av och slå på maskinen en gång. Om ljudet kvarstår behöver du tömma smutsvattentanken innan du fortsätter.'}
          </p>
        </div>
      </section>

      <section id="aterlamning" className="guideSection">
        <div className="stepHeading">
          <span>4</span>
          <h2>{en ? 'Before returning' : 'Innan återlämning'}</h2>
        </div>

        <p>
          {en
            ? 'Wipe the machine clean and rinse the internal system with clean water before returning it.'
            : 'Torka av maskinen och skölj igenom det interna systemet med rent vatten innan återlämning.'}
        </p>

        <div className="guideTextCard">
          <strong>{en ? 'Rinse the hose and nozzle' : 'Skölj slang och munstycke'}</strong>
          <p>
            {en
              ? 'Fill the clean-water tank with water only. Attach the narrow nozzle, hold the spray trigger and place the nozzle down into clean water so the machine sucks the water through the hoses. Keep the trigger held until the clean-water tank is empty.'
              : 'Fyll renvattentanken med endast vatten. Montera det smala munstycket, håll in sprayknappen och placera munstycket ned i rent vatten så att vattnet sugs genom slangarna. Fortsätt hålla inne knappen tills renvattentanken är tom.'}
          </p>
        </div>

        <div className="infoBox">
          <InfoIcon />
          <div>
            <b>{en ? 'FINISH' : 'AVSLUTA'}</b>
            <p>
              {en
                ? 'Empty the dirty-water tank and leave the machine and accessories clean.'
                : 'Töm smutsvattentanken och lämna maskin och tillbehör rena.'}
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
