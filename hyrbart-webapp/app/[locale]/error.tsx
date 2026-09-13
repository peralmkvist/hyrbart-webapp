'use client';

import { usePathname } from 'next/navigation';

export default function LocaleError({reset}:{error:Error&{digest?:string};reset:()=>void}){
  const pathname=usePathname();
  const en=pathname?.split('/')[1]==='en';
  const home=en?'/en':'/sv';
  return <section className="launchState" role="alert"><div className="launchStateCard"><div className="launchStateMark" aria-hidden="true">!</div><h1>{en?'Something went wrong':'Något gick fel'}</h1><p>{en?'The page could not be loaded. Your account or booking has not been changed by this error. Try again, or return to Hyrbart.':'Sidan kunde inte laddas. Ditt konto eller din bokning har inte ändrats av det här felet. Försök igen eller gå tillbaka till Hyrbart.'}</p><div className="launchStateActions"><button type="button" className="launchStateButton" onClick={reset}>{en?'Try again':'Försök igen'}</button><a className="launchStateButton secondary" href={home}>{en?'Go home':'Till startsidan'}</a></div></div></section>;
}
