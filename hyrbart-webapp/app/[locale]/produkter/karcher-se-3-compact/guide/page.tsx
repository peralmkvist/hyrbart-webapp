'use client';

import Link from 'next/link';
import { useEffect, useState, use } from 'react';
import { BackIcon, InfoIcon } from '@/components/Icons';

const ids = ['kom-igang', 'anvandning', 'vanliga-fel', 'aterlamning'];

const StepImage = ({ type }: { type: number }) => (
  <div className={`guideImage guideImage${type}`}>
    <div className="tank"><div className="fill" /></div>
    {type === 1 ? <div className="pour">↘</div> : <div className="bottle">RM 519</div>}
  </div>
);

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
        if (el && el.getBoundingClientRect().top <= 154) current = id;
        else if (el) break;
      }

      setActiveSection(current);
    };

    const hash = () => {
      const h = window.location.hash.slice(1);
      if (ids.includes(h)) setActiveSection(h);
      requestAnimationFrame(update);
    };

    hash();
    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    window.addEventListener('hashchange', hash);

    return () => {
      window.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
      window.removeEventListener('hashchange', hash);
    };
  }, []);

  return (
    <div className="guidePage pageShell">
      <div className="guideHeaderSticky">
        <Link
          href={`/${locale}/produkter/karcher-se-3-compact`}
          className="guideBackRow"
          aria-label={en ? 'Back to product page' : 'Tillbaka till produktsidan'}
        >
          <BackIcon />
          <span>{en ? 'Back to product page' : 'Tillbaka till produktsidan'}</span>
        </Link>

        <div className="guideProductRow">
          <strong>KÄRCHER SE 3 COMPACT</strong>
        </div>

        <nav className="guideTabs" aria-label={en ? 'Guide sections' : 'Guideavsnitt'}>
          {sections.map((s) => (
            <a
              key={s.id}
              href={`#${s.id}`}
              className={activeSection === s.id ? 'active' : ''}
              aria-current={activeSection === s.id ? 'location' : undefined}
              onClick={() => setActiveSection(s.id)}
            >
              {s.label}
            </a>
          ))}
        </nav>
      </div>

      <section id="kom-igang" className="guideSection">
        <div className="stepHeading"><span>1</span><h1>{en ? 'Fill the tank' : 'Fyll tanken'}</h1></div>
        <p>{en
          ? 'One dose of detergent has already been added. Only add warm water up to the mark.'
          : 'En dos rengöringsmedel är redan tillsatt. Fyll endast på varmt vatten till markeringen.'}</p>
        <StepImage type={1} />
        <div className="infoBox">
          <InfoIcon />
          <div>
            <b>{en ? 'IMPORTANT' : 'VIKTIGT'}</b>
            <p>{en
              ? 'Do not add more detergent for the first fill.'
              : 'Tillsätt inte ytterligare rengöringsmedel vid första fyllningen.'}</p>
          </div>
        </div>
      </section>

      <section id="anvandning" className="guideSection">
        <div className="stepHeading"><span>2</span><h2>{en ? 'Use the right detergent' : 'Använd rätt medel'}</h2></div>
        <p>{en
          ? 'Only use detergent intended for carpet and upholstery cleaners.'
          : 'Använd endast rengöringsmedel anpassat för textiltvätt. Andra medel kan skada maskinen eller ge sämre resultat.'}</p>
        <StepImage type={2} />
      </section>

      <section id="vanliga-fel" className="guideSection">
        <div className="stepHeading"><span>3</span><h2>{en ? 'When the dirty-water tank is full' : 'När smutsvattentanken är full'}</h2></div>
        <p>{en
          ? 'If the machine suddenly sounds like a vacuum nozzle stuck to dense material, the dirty-water tank may be full. Switch it off and empty the tank.'
          : 'Om maskinen plötsligt låter som när ett dammsugarmunstycke fastnar mot ett tätt material kan smutsvattentanken vara full. Stäng av och töm tanken.'}</p>
      </section>

      <section id="aterlamning" className="guideSection">
        <div className="stepHeading"><span>4</span><h2>{en ? 'Before returning' : 'Innan återlämning'}</h2></div>
        <p>{en
          ? 'Wipe down the machine and flush the system with clean water so the hose and nozzle are left clean.'
          : 'Torka av maskinen och skölj igenom systemet med rent vatten så att slang och munstycke lämnas rena.'}</p>
      </section>
    </div>
  );
}
