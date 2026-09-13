'use client';

import { usePathname } from 'next/navigation';

export default function LocaleNotFound(){
  const pathname=usePathname();
  const en=pathname?.split('/')[1]==='en';
  const home=en?'/en':'/sv';
  const products=`${home}/produkter`;
  return <section className="launchState"><div className="launchStateCard"><div className="launchStateMark" aria-hidden="true">404</div><h1>{en?'We could not find that page':'Vi hittar inte sidan'}</h1><p>{en?'The link may be old, the listing may no longer be available, or the address may be incorrect.':'Länken kan vara gammal, annonsen kan ha tagits bort eller adressen kan vara fel.'}</p><div className="launchStateActions"><a className="launchStateButton" href={products}>{en?'Browse rentals':'Utforska uthyrning'}</a><a className="launchStateButton secondary" href={home}>{en?'Go home':'Till startsidan'}</a></div></div></section>;
}
