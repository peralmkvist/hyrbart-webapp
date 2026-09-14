import Link from 'next/link';
import { redirect } from 'next/navigation';
import FollowersList from '@/components/FollowersList';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export default async function FollowersPage({params}:{params:Promise<{locale:string}>}){
  const {locale}=await params;
  const en=locale==='en';
  const supabase=await createClient();
  const {data:{user}}=await supabase.auth.getUser();
  if(!user) redirect(`/topsecret/${locale}/logga-in?next=${encodeURIComponent(`/topsecret/${locale}/vard/profil/foljare`)}`);
  return <section className="ds2Page" style={{paddingBottom:120}}>
    <header className="ds2Header" style={{display:'flex',alignItems:'center',gap:14}}><Link href={`/topsecret/${locale}/vard/profil`} aria-label={en?'Back':'Tillbaka'} style={{fontSize:28,textDecoration:'none',color:'inherit'}}>‹</Link><div><h1 style={{margin:0}}>{en?'My followers':'Mina följare'}</h1><p className="ds2Intro" style={{margin:'4px 0 0'}}>{en?'Only you can see your complete follower list.':'Endast du kan se hela din följarlista.'}</p></div></header>
    <div style={{padding:'0 20px'}}><FollowersList locale={locale}/></div>
  </section>;
}
