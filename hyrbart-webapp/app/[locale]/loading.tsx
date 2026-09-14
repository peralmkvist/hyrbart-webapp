'use client';

import { usePathname } from 'next/navigation';

export default function LocaleLoading(){
  const pathname=usePathname();
  const en=/\/(?:topsecret\/)?en(?:\/|$)/.test(pathname);
  return <div className="launchLoading" role="status" aria-live="polite" aria-label={en?'Loading':'Laddar'}><div className="launchLoadingBar short"/><div className="launchLoadingBar"/><div className="launchLoadingBlock"/><div className="launchLoadingGrid"><div className="launchLoadingBlock"/><div className="launchLoadingBlock"/></div><span className="srOnly">{en?'Loading content…':'Laddar innehåll…'}</span></div>
}
