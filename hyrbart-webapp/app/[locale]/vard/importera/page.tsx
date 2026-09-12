import Link from 'next/link';
import { redirect } from 'next/navigation';
import ListingImportFlow from '@/components/ListingImportFlow';
import { createClient } from '@/lib/supabase/server';

export default async function ImportListingsPage({params}:{params:Promise<{locale:string}>}){
  const {locale}=await params;
  const en=locale==='en';
  const supabase=await createClient();
  const {data:{user}}=await supabase.auth.getUser();
  if(!user)redirect(`/topsecret/${locale}/logga-in?next=${encodeURIComponent(`/topsecret/${locale}/vard/importera`)}`);

  return <section className="ds2Page profileDashboard">
    <header className="ds2Header" style={{display:'flex',alignItems:'center',gap:14}}><Link href={`/topsecret/${locale}/vard/meny`} aria-label={en?'Back':'Tillbaka'} style={{fontSize:32,color:'inherit',textDecoration:'none'}}>‹</Link><h1>{en?'Import listings':'Importera annonser'}</h1></header>
    <ListingImportFlow locale={locale}/>
  </section>;
}
