import Link from 'next/link';
import { redirect } from 'next/navigation';
import NotificationPreferences from '@/components/NotificationPreferences';
import { createClient } from '@/lib/supabase/server';
import '../profile-menu.css';

export default async function NotificationsPage({params,searchParams}:{params:Promise<{locale:string}>;searchParams:Promise<{back?:string}>}){
  const {locale}=await params;
  const {back}=await searchParams;
  const en=locale==='en';
  const hostMode=back==='vard';
  const supabase=await createClient();
  const {data:{user}}=await supabase.auth.getUser();
  if(!user)redirect(`/topsecret/${locale}/logga-in?next=${encodeURIComponent(`/topsecret/${locale}/profil/notiser${hostMode?'?back=vard':''}`)}`);
  const backHref=hostMode?`/topsecret/${locale}/vard/profil`:`/topsecret/${locale}/profil`;
  return <section className="ds2Page profileSettingsPage">
    <header className="profileSubHeader"><Link href={backHref} aria-label={en?'Back':'Tillbaka'}>‹</Link><h1>{en?'Notification settings':'Notisinställningar'}</h1></header>
    <p className="profileSettingsIntro">{en?'Choose which optional notifications you want and how Hyrbart may deliver them. Your actual notifications are available from the bell at the top right.':'Välj vilka valbara notiser du vill ha och genom vilka kanaler Hyrbart får skicka dem. Dina faktiska notiser öppnar du via klockan uppe till höger.'}</p>
    <NotificationPreferences locale={locale}/>
  </section>;
}
