'use client';

import Link from 'next/link';
import { use, useEffect, useState } from 'react';
import { BackIcon } from '@/components/Icons';

const ids = ['kom-igang', 'anvandning', 'vanliga-fel', 'aterlamning'];

export default function BoschGuidePage({
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
      const header = document.querySelector('.guideHeaderSticky');
      const headerBottom =
        header?.getBoundingClientRect().bottom ?? 205;

      let current = ids[0];

      for (const id of ids) {
        const el = document.getElementById(id);

        if (el && el.getBoundingClientRect().top <= headerBottom + 1) {
          current = id;
        } else if (el) {
          break;
        }
      }

      setActiveSection(current);
    };

    const scrollToHash = () => {
      const hash = window.location.hash.slice(1);

      if (!ids.includes(hash)) {
        update();
        return;
      }

      setActiveSection(hash);

      requestAnimationFrame(() => {
        const header = document.querySelector('.guideHeaderSticky');
        const target = document.getElementById(hash);

        if (!target) return;

        const headerHeight =
          header?.getBoundingClientRect().height ?? 205;

        const top =
          target.getBoundingClientRect().top +
          window.scrollY -
          headerHeight -
          8;

        window.scrollTo({
          top,
          behavior: 'smooth',
        });
      });
    };

    scrollToHash();

    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    window.addEventListener('hashchange', scrollToHash);

    return () => {
      window.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
      window.removeEventListener('hashchange', scrollToHash);
    };
  }, []);

  const handleTabClick = (
    event: React.MouseEvent<HTMLAnchorElement>,
    id: string
  ) => {
    event.preventDefault();

    const header = document.querySelector('.guideHeaderSticky');
    const target = document.getElementById(id);

    if (!target) return;

    setActiveSection(id);
    window.history.replaceState(null, '', `#${id}`);

    const headerHeight =
      header?.getBoundingClientRect().height ?? 205;

    const top =
      target.getBoundingClientRect().top +
      window.scrollY -
      headerHeight -
      8;

    window.scrollTo({
      top,
      behavior: 'smooth',
    });
  };

  return (
    <div className="pageShell guidePage">
      <div className="guideHeaderSticky">
        <Link
          href={`/${locale}/produkter/bosch-gbh-18v-22`}
          className="guideBackRow"
          aria-label={en ? 'Back to product page' : 'Tillbaka till produktsidan'}
        >
          <BackIcon />
          <span>
            {en ? 'Back to product page' : 'Tillbaka till produktsidan'}
          </span>
        </Link>

        <div className="guideCategoryRow">
          {en ? 'User guide' : 'Användarguide'}
        </div>

        <header className="guideIdentityRow">
          <h1>
            <span>BOSCH</span>
            <span>GBH 18V-22</span>
          </h1>
        </header>

        <nav
          className="guideTabs"
          aria-label={en ? 'Guide sections' : 'Guideavsnitt'}
        >
          {sections.map((section) => (
            <a
              key={section.id}
              href={`#${section.id}`}
              className={activeSection === section.id ? 'active' : ''}
              aria-current={
                activeSection === section.id ? 'location' : undefined
              }
              onClick={(event) => handleTabClick(event, section.id)}
            >
              {section.label}
            </a>
          ))}
        </nav>
      </div>

      <section id="kom-igang" className="guideSection">
        <div className="stepHeading">
          <span>1</span>
          <h2>{en ? 'Get started' : 'Kom igång'}</h2>
        </div>

        <p>
          {en
            ? 'Choose the drill bit or chisel that suits the job. Insert the SDS plus accessory until it locks, fit a charged battery and check that the correct operating mode is selected before you begin.'
            : 'Välj borr eller mejsel efter jobbet. För in SDS plus-tillbehöret tills det låser, montera ett laddat batteri och kontrollera att rätt funktionsläge är valt innan du börjar.'}
        </p>

        <div className="guideTextCard">
          <strong>{en ? 'For drilling' : 'För borrning'}</strong>
          <p>
            {en
              ? 'Use one of the included concrete drill bits and set the machine to hammer drilling.'
              : 'Använd någon av de medföljande betongborrarna och ställ maskinen i läget för hammarborrning.'}
          </p>
        </div>

        <div className="guideTextCard">
          <strong>{en ? 'For chiselling' : 'För bilning'}</strong>
          <p>
            {en
              ? 'Fit a suitable chisel and select the chiselling mode.'
              : 'Montera en lämplig bilningsmejsel och välj bilningsläget.'}
          </p>
        </div>
      </section>

      <section id="anvandning" className="guideSection">
        <div className="stepHeading">
          <span>2</span>
          <h2>{en ? 'Use' : 'Användning'}</h2>
        </div>

        <p>
          {en
            ? 'Hold the machine firmly with both hands and let the hammer mechanism do the work. Avoid pressing harder than necessary.'
            : 'Håll maskinen stadigt med båda händerna och låt slagmekanismen göra jobbet. Undvik att trycka hårdare än nödvändigt.'}
        </p>

        <div className="guideTextCard">
          <strong>{en ? 'Dust extraction' : 'Dammutsug'}</strong>
          <p>
            {en
              ? 'Use the supplied dust extraction attachment when appropriate. Make sure it is fitted securely before drilling.'
              : 'Använd det medföljande dammutsuget när det passar arbetet. Kontrollera att det sitter ordentligt innan du börjar borra.'}
          </p>
        </div>

        <div className="guideTextCard">
          <strong>{en ? 'Depth stop' : 'Djupanslag'}</strong>
          <p>
            {en
              ? 'Use the depth stop when several holes need the same drilling depth.'
              : 'Använd djupanslaget när flera hål ska borras till samma djup.'}
          </p>
        </div>
      </section>

      <section id="vanliga-fel" className="guideSection">
        <div className="stepHeading">
          <span>3</span>
          <h2>{en ? 'Common problems' : 'Vanliga fel'}</h2>
        </div>

        <div className="guideTextCard">
          <strong>
            {en ? 'The machine does not start' : 'Maskinen startar inte'}
          </strong>
          <p>
            {en
              ? 'Check that the battery is charged and fully inserted. If necessary, try the second battery.'
              : 'Kontrollera att batteriet är laddat och helt inskjutet. Prova vid behov det andra batteriet.'}
          </p>
        </div>

        <div className="guideTextCard">
          <strong>
            {en
              ? 'Drilling is unusually slow'
              : 'Det går ovanligt långsamt att borra'}
          </strong>
          <p>
            {en
              ? 'Check that hammer drilling is selected and that the drill bit is suitable for the material.'
              : 'Kontrollera att hammarborrning är vald och att borren är avsedd för materialet.'}
          </p>
        </div>

        <div className="guideTextCard">
          <strong>{en ? 'The drill bit gets stuck' : 'Borren fastnar'}</strong>
          <p>
            {en
              ? 'Release the trigger immediately. Remove the drill bit carefully before continuing.'
              : 'Släpp avtryckaren direkt. Lossa borren försiktigt innan du fortsätter.'}
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
            ? 'Remove the drill bit or chisel and wipe dust and dirt from the machine before putting everything back in the case.'
            : 'Ta ur borr eller mejsel och torka bort damm och smuts från maskinen innan allt läggs tillbaka i väskan.'}
        </p>

        <div className="guideTextCard">
          <strong>{en ? 'Check the contents' : 'Kontrollera innehållet'}</strong>
          <p>
            {en
              ? 'Please make sure both batteries, charger, depth stop, dust extraction attachment, concrete drill bits, chisels and storage case are returned.'
              : 'Kontrollera att båda batterierna, laddaren, djupanslaget, dammutsuget, betongborrarna, bilningsmejslarna och förvaringsväskan följer med tillbaka.'}
          </p>
        </div>

        <p>
          <strong>
            {en
              ? 'This is currently a preliminary guide and will be refined later.'
              : 'Detta är tills vidare en preliminär guide som vi kommer att finslipa senare.'}
          </strong>
        </p>
      </section>
    </div>
  );
}
