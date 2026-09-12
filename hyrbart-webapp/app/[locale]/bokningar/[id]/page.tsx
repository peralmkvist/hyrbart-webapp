import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getProducts } from '@/lib/sanity-products';
import styles from '../demo/page.module.css';

function formatDate(value:string, locale:string){
  return new Intl.DateTimeFormat(locale==='en'?'en-GB':'sv-SE',{day:'numeric',month:'short'}).format(new Date(`${value}T12:00:00`));
}
function statusLabel(status:string,en:boolean){
  const sv:Record<string,string>={requested:'Förfrågan skickad',reserved:'Reserverad',accepted:'Godkänd',paid:'Betald',active:'Pågående',returned:'Återlämnad',completed:'Slutförd',declined:'Nekad',cancelled:'Avbokad',disputed:'Tvist',refunded:'Återbetald'};
  const english:Record<string,string>={requested:'Request sent',reserved:'Reserved',accepted:'Accepted',paid:'Paid',active:'Active',returned:'Returned',completed:'Completed',declined:'Declined',cancelled:'Cancelled',disputed:'Disputed',refunded:'Refunded'};
  return (en?english:sv)[status]??status;
}

export default async function BookingPage({params}:{params:Promise<{locale:string;id:string}>}){
  const {locale,id}=await params; const en=locale==='en';
  const supabase=await createClient();
  const {data:{user}}=await supabase.auth.getUser();
  if(!user) redirect(`/topsecret/${locale}/logga-in?next=${encodeURIComponent(`/topsecret/${locale}/bokningar/${id}`)}`);

  const {data:booking,error}=await supabase.from('bookings').select('*').eq('id',id).maybeSingle();
  if(error||!booking) notFound();
  const products=await getProducts();
  const product=products.find(item=>item.id===booking.product_id);
  const {data:owner}=await supabase.from('profiles').select('display_name,avatar_url,city').eq('id',booking.owner_id).maybeSingle();
  const ownerName=owner?.display_name||product?.owner?.name||'Uthyrare';
  const ownerImage=owner?.avatar_url||product?.owner?.profileImage;
  const reference=`HYR-${booking.id.replace(/-/g,'').slice(0,8).toUpperCase()}`;
  const total=Number(booking.total_price||0).toLocaleString(en?'en-GB':'sv-SE');
  const productName=product?.name || (en?'Listing':'Annons');

  return <main className={styles.page}>
    <header className={styles.topbar}>
      <Link href={`/topsecret/${locale}/kalender`} className={styles.back} aria-label={en?'Back':'Tillbaka'}>‹</Link>
      <h1>{en?'Booking':'Bokning'}</h1>
    </header>

    <section className={styles.productCard}>
      <span>{en?'Product':'Produkt'}</span>
      <strong>{product?.brand||''}</strong>
      <h2>{productName}</h2>
      {product?<small>{en?(product.typeEn||product.type):product.type}</small>:null}
    </section>

    <section className={styles.ownerCard}>
      {ownerImage?<img src={ownerImage} alt={ownerName} className={styles.ownerAvatarImage}/>:<div className={styles.ownerAvatar}>{ownerName.slice(0,1)}</div>}
      <div><span>{en?'Owner':'Uthyrare'}</span><h2>{ownerName}</h2>{owner?.city?<small>{owner.city}</small>:null}</div>
    </section>

    <section className={styles.card}>
      <div className={styles.split}><div><span>{en?'Pickup':'Utlämning'}</span><strong>{formatDate(booking.start_date,locale)}</strong></div><div><span>{en?'Return':'Återlämning'}</span><strong>{formatDate(booking.end_date,locale)}</strong></div></div>
      <div className={styles.total}><span>{en?'Total':'Totalsumma'}</span><strong>{total} kr</strong></div>
    </section>

    <section className={styles.card}>
      <div className={styles.infoRow}><div><span>{en?'Status':'Status'}</span><strong>{statusLabel(booking.status,en)}</strong></div></div>
      <div className={styles.divider}/>
      <div className={styles.infoRow}><div><span>{en?'Booking date':'Bokningsdatum'}</span><strong>{new Intl.DateTimeFormat(en?'en-GB':'sv-SE',{day:'numeric',month:'short',year:'numeric'}).format(new Date(booking.created_at))}</strong></div></div>
      <div className={styles.divider}/>
      <div className={styles.infoRow}><div><span>{en?'Booking reference':'Bokningsreferens'}</span><strong>{reference}</strong></div></div>
    </section>

    {booking.message?<section className={styles.card}><div className={styles.infoRow}><div><span>{en?'Your question':'Din fråga'}</span><strong>{booking.message}</strong></div></div></section>:null}
    <Link href={`/topsecret/${locale}/meddelanden`} className={styles.message}>{en?'Send message':'Skicka meddelande'}</Link>
  </main>;
}
