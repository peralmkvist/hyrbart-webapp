'use client';

import { useEffect, useState } from 'react';

type GuideSection = {
  id: string;
  label: string;
};

export default function GuideTabs({
  sections,
  ariaLabel,
}: {
  sections: GuideSection[];
  ariaLabel: string;
}) {
  const [activeSection, setActiveSection] = useState(sections[0]?.id ?? '');

  useEffect(() => {
    const getOffset = () => {
      const header = document.querySelector<HTMLElement>('.guideHeaderSticky');
      if (!header) return 0;

      const stickyTop = Number.parseFloat(getComputedStyle(header).top) || 0;
      return header.getBoundingClientRect().height + stickyTop + 12;
    };

    const scrollToSection = (id: string, behavior: ScrollBehavior = 'smooth') => {
      const target = document.getElementById(id);
      if (!target) return;

      const top =
        window.scrollY +
        target.getBoundingClientRect().top -
        getOffset();

      window.scrollTo({
        top: Math.max(0, top),
        behavior,
      });
    };

    const updateActiveSection = () => {
      const offset = getOffset();
      let current = sections[0]?.id ?? '';

      for (const section of sections) {
        const el = document.getElementById(section.id);
        if (!el) continue;

        if (el.getBoundingClientRect().top <= offset + 2) {
          current = section.id;
        } else {
          break;
        }
      }

      setActiveSection(current);
    };

    const applyHash = () => {
      const hash = window.location.hash.slice(1);
      if (!sections.some((section) => section.id === hash)) return;

      setActiveSection(hash);

      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          scrollToSection(hash, 'auto');
        });
      });
    };

    applyHash();
    updateActiveSection();

    window.addEventListener('scroll', updateActiveSection, { passive: true });
    window.addEventListener('resize', updateActiveSection);
    window.addEventListener('hashchange', applyHash);

    return () => {
      window.removeEventListener('scroll', updateActiveSection);
      window.removeEventListener('resize', updateActiveSection);
      window.removeEventListener('hashchange', applyHash);
    };
  }, [sections]);

  return (
    <nav
      className="guideTabs"
      aria-label={ariaLabel}
      style={{
        gridTemplateColumns: 'repeat(4, max-content)',
        justifyContent: 'space-between',
        columnGap: '6px',
      }}
    >
      {sections.map((section) => (
        <a
          key={section.id}
          href={`#${section.id}`}
          className={activeSection === section.id ? 'active' : ''}
          aria-current={activeSection === section.id ? 'location' : undefined}
          style={{
            paddingLeft: 0,
            paddingRight: 0,
            fontSize: 'clamp(.68rem, 3vw, .82rem)',
          }}
          onClick={(event) => {
            event.preventDefault();

            const header = document.querySelector<HTMLElement>('.guideHeaderSticky');
            const target = document.getElementById(section.id);
            if (!target) return;

            const stickyTop = header
              ? Number.parseFloat(getComputedStyle(header).top) || 0
              : 0;
            const offset = header
              ? header.getBoundingClientRect().height + stickyTop + 12
              : 0;

            const top =
              window.scrollY +
              target.getBoundingClientRect().top -
              offset;

            window.history.replaceState(null, '', `#${section.id}`);
            setActiveSection(section.id);

            window.scrollTo({
              top: Math.max(0, top),
              behavior: 'smooth',
            });
          }}
        >
          {section.label}
        </a>
      ))}
    </nav>
  );
}
