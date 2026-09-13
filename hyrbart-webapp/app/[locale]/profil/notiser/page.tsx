import Link from 'next/link';
import { redirect } from 'next/navigation';
import NotificationsList from '@/components/NotificationsList';
import { createClient } from '@/lib/supabase/server';

export default async function NotificationsPage({params}:{params:Promise<{locale:string}>}){
  const {locale}=await params;
  const supabase=await createClient();
  const {data:{user}}=await supabase.auth.getUser();
  if(!user)redirect(`/topsecret/${locale}/logga-in?next=${encodeURIComponent(`/topsecret/${locale}/profil/notiser`)}`);
  return <section className="ds2Page"><header className="ds2Header" style={{display:'flex',alignItems:'center',gap:12}}><Link href={`/topsecret/${locale}/profil`} style={{fontSize:28,textDecoration:'none',color:'inherit'}}>‹</Link><h1 style={{margin:0}}>{locale==='en'?'Notifications':'Notiser'}</h1></header><NotificationsList locale={locale}/></section>;
}
