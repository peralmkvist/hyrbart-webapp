import Link from 'next/link';
import { redirect } from 'next/navigation';
import SearchAlertsManager from '@/components/SearchAlertsManager';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export default async function SearchAlertsPage({params}:{params:Promise<{locale:string}>}){
  const {locale}=await params;
  const en=locale==='en';
  const supabase=await createClient();
  const {data:{user}}=await supabase.auth.getUser();
  if(!user)redirect(`/topsecret/${locale}/logga-in?next=${encodeURIComponent(`/topsecret/${locale}/profil/bevakningar`)}`);
  return <section className="ds2Page" style={{paddingBottom:120}}>
    <header className="ds2Header" style={{display:'flex',alignItems:'center',gap:12}}><Link href={`/topsecret/${locale}/profil`} aria-label={en?'Back to profile':'Tillbaka till profil'} style={{fontSize:28,textDecoration:'none',color:'inherit'}}>‹</Link><div><h1 style={{margin:0}}>{en?'Search watches':'Sökbevakningar'}</h1><p className="ds2Intro" style={{margin:'4px 0 0'}}>{en?'Manage saved searches and availability alerts.':'Hantera sparade sökningar och tillgänglighetsbevakningar.'}</p></div></header>
    <SearchAlertsManager locale={locale}/>
  </section>;
}
