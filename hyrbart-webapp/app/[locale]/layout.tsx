import { notFound, redirect } from 'next/navigation';

export function generateStaticParams() { return [{ locale: 'sv' }, { locale: 'en' }]; }

async function getPreferredLanguage(): Promise<'sv'|'en'> {
  try {
    const projectId='djps09z6';
    const dataset='production';
    const apiVersion='2026-09-08';
    const query='*[_type=="userProfile"][0].preferredLanguage';
    const response=await fetch(`https://${projectId}.api.sanity.io/v${apiVersion}/data/query/${dataset}?query=${encodeURIComponent(query)}`,{cache:'no-store'});
    if(!response.ok)return 'sv';
    const payload=await response.json() as {result?:string};
    return payload.result==='en'?'en':'sv';
  } catch { return 'sv'; }
}

export default async function LocaleLayout({ children, params }: { children: React.ReactNode; params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (locale !== 'sv' && locale !== 'en') notFound();
  const preferredLanguage=await getPreferredLanguage();
  if(locale!==preferredLanguage) redirect(`/${preferredLanguage}`);
  return <>{children}</>;
}
