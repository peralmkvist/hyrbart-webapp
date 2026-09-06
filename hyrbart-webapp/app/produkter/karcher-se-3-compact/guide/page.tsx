'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { BackIcon, InfoIcon } from '@/components/Icons';

const sections = [
  { id: 'kom-igang', label: 'Kom igång' },
  { id: 'anvandning', label: 'Användning' },
  { id: 'vanliga-fel', label: 'Vanliga fel' },
  { id: 'aterlamning', label: 'Återlämning' },
];

const StepImage = ({ type }: { type: number }) => (
  <div className={`guideImage guideImage${type}`}>
    <div className="tank"><div className="fill" /></div>
    {type === 1 ? <div className="pour">↘</div> : <div className="bottle">RM 519</div>}
  </div>
);

export default function GuidePage() {
  const [activeSection, setActiveSection] = useState('kom-igang');

  useEffect(() => {
    const updateActiveSection = () => {
      // Sticky header + tabs är ungefär 112 px höga.
      const triggerLine = 128;
      let current = sections[0].id;

      for (const section of sections) {
        const element = document.getElementById(section.id);
        if (!element) continue;

        if (element.getBoundingClientRect().top <= triggerLine) {
          current = section.id;
        } else {
          break;
        }
      }

      setActiveSection(current);
    };

    const syncFromHash = () => {
      const hash = window.location.hash.replace('#', '');
      if (sections.some((section) => section.id === hash)) {
        setActiveSection(hash);
      }
      requestAnimationFrame(updateActiveSection);
    };

    syncFromHash();
    window.addEventListener('scroll', updateActiveSection, { passive: true });
    window.addEventListener('resize', updateActiveSection);
    window.addEventListener('hashchange', syncFromHash);

    return () => {
      window.removeEventListener('scroll', updateActiveSection);
      window.removeEventListener('resize', updateActiveSection);
      window.removeEventListener('hashchange', syncFromHash);
    };
  }, []);

  return (
    <div className="guidePage pageShell">
      <div className="guideSticky">
        <div className="guideTop">
          <Link href="/produkter/karcher-se-3-compact" aria-label="Till produkten">
            <BackIcon />
          </Link>
          <strong>KÄRCHER SE 3 COMPACT</strong>
        </div>

        <nav className="guideTabs" aria-label="Guideavsnitt">
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
        <div className="stepHeading"><span>1</span><h1>Fyll tanken</h1></div>
        <p>En dos rengöringsmedel är redan tillsatt. Fyll endast på varmt vatten till markeringen.</p>
        <StepImage type={1} />
        <div className="infoBox">
          <InfoIcon />
          <div><b>VIKTIGT</b><p>Tillsätt inte ytterligare rengöringsmedel vid första fyllningen.</p></div>
        </div>
      </section>

      <section id="anvandning" className="guideSection">
        <div className="stepHeading"><span>2</span><h2>Använd rätt medel</h2></div>
        <p>Använd endast rengöringsmedel anpassat för textiltvätt. Andra medel kan skada maskinen eller ge sämre resultat.</p>
        <StepImage type={2} />
      </section>

      <section id="vanliga-fel" className="guideSection">
        <div className="stepHeading"><span>3</span><h2>När smutsvattentanken är full</h2></div>
        <p>Om maskinen plötsligt låter som när ett dammsugarmunstycke fastnar mot ett tätt material kan smutsvattentanken vara full. Stäng av och töm tanken.</p>
      </section>

      <section id="aterlamning" className="guideSection">
        <div className="stepHeading"><span>4</span><h2>Innan återlämning</h2></div>
        <p>Torka av maskinen och skölj igenom systemet med rent vatten så att slang och munstycke lämnas rena.</p>
      </section>
    </div>
  );
}
