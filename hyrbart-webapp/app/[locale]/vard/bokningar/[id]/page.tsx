import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import HostBookingManage from '@/components/HostBookingManage';
import { createClient } from '@/lib/supabase/server';
import { getProducts } from '@/lib/sanity-products';
import styles from '../demo/page.module.css';

function formatDate(value:string, locale:string){
  return new Intl.DateTimeFormat(locale==='en'?'en-GB':'sv-SE',{day:'numeric',month:'short'}).format(new Date(`${value}T12:00:00`));
}
function statusLabel(status:string,en:boolean){
  const sv:Record<string,string>={requested:'Förfrågan',reserved:'Reserverad',accepted:'Godkänd',paid:'Betald',active:'Pågående',returned:'Återlämnad',completed:'Slutförd',declined:'Nekad',cancelled:'Avbokad',disputed:'Tvist',refunded:'Återbetald'};
  const english:Record<string,string>={requested:'Request',reserved:'Reserved',accepted:'Accepted',paid:'Paid',active:'Active',returned:'Returned',completed:'Completed',declined:'Declined',cancelled:'Cancelled',disputed:'Disputed',refunded:'Refunded'};
  return (en?english:sv)[status]??status;
}

export default async function HostBookingPage({params}:{params:Promise<{locale:string;id:string}>}){
  const {locale,id}=await params; const en=locale==='en';
  const supabase=await createClient();
  const {data:{user}}=await supabase.auth.getUser();
  if(!user) redirect(`/topsecret/${locale}/logga-in?next=${encodeURIComponent(`/topsecret/${locale}/vard/bokningar/${id}`)}`);

  const {data:booking,error}=await supabase.from('bookings').select('*').eq('id',id).maybeSingle();
  if(error||!booking||booking.owner_id!==user.id) notFound();

  const [products, renterResult] = await Promise.all([
    getProducts(),
    supabase.from('profiles').select('display_name,avatar_url,city').eq('id',booking.renter_id).maybeSingle(),
  ]);
  const product=products.find(item=>item.id===booking.product_id);
  const renter=renterResult.data;
  const renterName=renter?.display_name|| (en?'Renter':'Hyresperson');
  const reference=`HYR-${booking.id.replace(/-/g,'').slice(0,8).toUpperCase()}`;
  const total=Number(booking.total_price||0).toLocaleString(en?'en-GB':'sv-SE');

  return <main className={styles.page}>
    <header className={styles.topbar}>
      <Link href={`/${locale}/vard`} className={styles.back} aria-label={en?'Back to calendar':'Tillbaka till kalendern'}>‹</Link>
      <h1>{en?'Booking':'Bokning'}</h1>
    </header>

    <section className={styles.productCard}>
      <span>{en?'Product':'Produkt'}</span>
      <strong>{product?.brand||''}</strong>
      <h2>{product?.name||(en?'Listing':'Annons')}</h2>
      {product?<small>{en?(product.typeEn||product.type):product.type}</small>:null}
    </section>

    <section className={styles.hero}>
      {renter?.avatar_url?<img src={renter.avatar_url} alt={renterName} className={styles.avatar}/>:<div className={styles.avatar} style={{display:'grid',placeItems:'center',fontWeight:850}}>{renterName.slice(0,1)}</div>}
      <div><span>{en?'Rented by':'Hyresperson'}</span><h2>{renterName}</h2>{renter?.city?<small>{renter.city}</small>:null}</div>
    </section>

    <section className={styles.card}>
      <div className={styles.split}><div><span>{en?'Pickup':'Utlämning'}</span><strong>{formatDate(booking.start_date,locale)}</strong></div><div><span>{en?'Return':'Återlämning'}</span><strong>{formatDate(booking.end_date,locale)}</strong></div></div>
      <div className={styles.total}><span>{en?'Total':'Totalsumma'}</span><strong>{total} kr</strong></div>
    </section>

    <HostBookingManage bookingId={booking.id} status={booking.status} locale={locale} className={styles.manage}/>

    <section className={styles.card}>
      <div className={styles.infoRow}><div><span>{en?'Status':'Status'}</span><strong>{statusLabel(booking.status,en)}</strong></div></div>
      <div className={styles.divider}/>
      <div className={styles.infoRow}><div><span>{en?'Booking date':'Bokningsdatum'}</span><strong>{new Intl.DateTimeFormat(en?'en-GB':'sv-SE',{day:'numeric',month:'short',year:'numeric'}).format(new Date(booking.created_at))}</strong></div></div>
      <div className={styles.divider}/>
      <div className={styles.infoRow}><div><span>{en?'Booking reference':'Bokningsreferens'}</span><strong>{reference}</strong></div></div>
    </section>

    {booking.message?<section className={styles.card}><div className={styles.infoRow}><div><span>{en?'Message from renter':'Meddelande från hyrespersonen'}</span><strong>{booking.message}</strong></div></div></section>:null}
    <Link href={`/${locale}/vard/meddelanden`} className={styles.message}>{en?'Send message':'Skicka meddelande'}</Link>
  </main>;
}
