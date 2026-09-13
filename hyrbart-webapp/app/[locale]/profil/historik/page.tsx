import Link from 'next/link';
import { redirect } from 'next/navigation';
import ExternalHistoryForm from '@/components/ExternalHistoryForm';
import { createClient } from '@/lib/supabase/server';

export default async function ExternalHistoryPage({params}:{params:Promise<{locale:string}>}){
  const {locale}=await params;
  const en=locale==='en';
  const supabase=await createClient();
  const {data:{user}}=await supabase.auth.getUser();
  if(!user)redirect(`/topsecret/${locale}/logga-in?next=${encodeURIComponent(`/topsecret/${locale}/profil/historik`)}`);

  return <section className="ds2Page profileDashboard">
    <header className="ds2Header" style={{display:'flex',alignItems:'center',gap:14}}>
      <Link href={`/topsecret/${locale}/profil`} aria-label={en?'Back':'Tillbaka'} style={{fontSize:32,color:'inherit',textDecoration:'none'}}>‹</Link>
      <h1>{en?'External history':'Extern historik'}</h1>
    </header>
    <ExternalHistoryForm locale={locale}/>
  </section>;
}
