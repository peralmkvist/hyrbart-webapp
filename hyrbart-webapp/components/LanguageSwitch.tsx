'use client';

import { usePathname } from 'next/navigation';

function SwedishFlag() {
  return (
    <svg
      viewBox="0 0 36 36"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
      focusable="false"
    >
      <rect width="36" height="36" fill="#006AA7" />
      <rect x="0" y="15" width="36" height="6" fill="#FECC00" />
      <rect x="11" y="0" width="6" height="36" fill="#FECC00" />
    </svg>
  );
}

function BritishFlag() {
  return (
    <svg
      viewBox="0 0 36 36"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
      focusable="false"
    >
      <rect width="36" height="36" fill="#012169" />

      <path d="M0 0L36 36M36 0L0 36" stroke="#fff" strokeWidth="8" />
      <path d="M0 0L36 36M36 0L0 36" stroke="#C8102E" strokeWidth="4" />

      <path d="M18 0V36M0 18H36" stroke="#fff" strokeWidth="11" />
      <path d="M18 0V36M0 18H36" stroke="#C8102E" strokeWidth="6" />
    </svg>
  );
}

export default function LanguageSwitch() {
  const pathname = usePathname();

  const isEnglish = pathname === '/en' || pathname.startsWith('/en/');
  const currentLocale = isEnglish ? 'en' : 'sv';
  const targetLocale = isEnglish ? 'sv' : 'en';

  const targetPath = pathname.replace(
    new RegExp(`^/${currentLocale}(?=/|$)`),
    `/${targetLocale}`,
  );

  const label = isEnglish ? 'Byt till svenska' : 'Switch to English';

  const switchLanguage = () => {
    window.location.href = `${targetPath}${window.location.search}${window.location.hash}`;
  };

  return (
    <button
      className="languageSwitch"
      onClick={switchLanguage}
      aria-label={label}
      title={label}
    >
      {isEnglish ? <SwedishFlag /> : <BritishFlag />}
    </button>
  );
}
