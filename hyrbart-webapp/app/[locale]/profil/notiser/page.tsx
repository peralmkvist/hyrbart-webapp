import Link from 'next/link';
import { redirect } from 'next/navigation';
import NotificationsList from '@/components/NotificationsList';
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
    <header className="profileSubHeader"><Link href={backHref} aria-label={en?'Back':'Tillbaka'}>‹</Link><h1>{en?'Notifications':'Notiser'}</h1></header>
    <p className="profileSettingsIntro">{en?'Updates about bookings, messages, payments and other activity connected to your account.':'Uppdateringar om bokningar, meddelanden, betalningar och annan aktivitet kopplad till ditt konto.'}</p>
    <NotificationsList locale={locale}/>
  </section>;
}
