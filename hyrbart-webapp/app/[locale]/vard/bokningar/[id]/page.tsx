import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import HostBookingManage from '@/components/HostBookingManage';
import BookingConditionEvidence from '@/components/BookingConditionEvidence';
import BookingCancellationFlow from '@/components/BookingCancellationFlow';
import RenterReputationCard from '@/components/RenterReputationCard';
import { createClient } from '@/lib/supabase/server';
import { getProducts } from '@/lib/sanity-products';
import styles from '../demo/page.module.css';

function formatDate(value:string, locale:string){
  return new Intl.DateTimeFormat(locale==='en'?'en-GB':'sv-SE',{day:'numeric',month:'short'}).format(new Date(`${value}T12:00:00`));
}
function statusLabel(status:string,en:boolean){
  const sv:Record<string,string>={requested:'Förfrågan',reserved:'Reserverad',accepted:'Väntar på betalning',paid:'Betald',active:'Pågående',returned:'Återlämnad',completed:'Slutförd',declined:'Nekad',cancelled:'Avbokad',disputed:'Tvist',refunded:'Återbetald'};
  const english:Record<string,string>={requested:'Request',reserved:'Reserved',accepted:'Awaiting payment',paid:'Paid',active:'Active',returned:'Returned',completed:'Completed',declined:'Declined',cancelled:'Cancelled',disputed:'Disputed',refunded:'Refunded'};
  return (en?english:sv)[status]??status;
}
function money(value:unknown, locale:string){ return Number(value||0).toLocaleString(locale==='en'?'en-GB':'sv-SE'); }

export default async function HostBookingPage({params}:{params:Promise<{locale:string;id:string}>}){
  const {locale,id}=await params; const en=locale==='en';
  const supabase=await createClient();
  const {data:{user}}=await supabase.auth.getUser();
  if(!user) redirect(`/topsecret/${locale}/logga-in?next=${encodeURIComponent(`/topsecret/${locale}/vard/bokningar/${id}`)}`);

  const {data:booking,error}=await supabase.from('bookings').select('*').eq('id',id).maybeSingle();
  if(error||!booking||booking.owner_id!==user.id) notFound();

  const [products, renterResult] = await Promise.all([
    getProducts(),
    supabase.from('profiles').select('display_name,avatar_url,city,bankid_verified,identity_verification_status').eq('id',booking.renter_id).maybeSingle(),
  ]);
  const product=products.find(item=>item.id===booking.product_id);
  const renter=renterResult.data;
  const renterName=renter?.display_name|| (en?'Renter':'Hyresperson');
  const reference=`HYR-${booking.id.replace(/-/g,'').slice(0,8).toUpperCase()}`;
  const renterVerified=Boolean(renter?.bankid_verified||renter?.identity_verification_status==='verified');

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

    <RenterReputationCard userId={booking.renter_id} name={renterName} verified={renterVerified} locale={locale}/>

    <section className={styles.card}>
      <div className={styles.split}><div><span>{en?'Pickup':'Utlämning'}</span><strong>{formatDate(booking.start_date,locale)}</strong></div><div><span>{en?'Return':'Återlämning'}</span><strong>{formatDate(booking.end_date,locale)}</strong></div></div>
      <div className={styles.divider}/>
      <div className={styles.infoRow}><div><span>{en?'Rental':'Hyra'}</span><strong>{money(booking.rental_price,locale)} kr</strong></div></div>
      <div className={styles.divider}/>
      <div className={styles.infoRow}><div><span>{en?'Service fee':'Serviceavgift'}</span><strong>{money(booking.service_fee,locale)} kr</strong></div></div>
      <div className={styles.total}><span>{en?'Total':'Totalsumma'}</span><strong>{money(booking.total_price,locale)} kr</strong></div>
      <small style={{display:'block',marginTop:10,color:'var(--muted)'}}>{en?'The booked price is locked even if the listing price changes later.':'Bokningens pris är låst även om annonspriset ändras senare.'}</small>
    </section>

    <BookingConditionEvidence bookingId={booking.id} status={booking.status} locale={locale} isRenter={false}/>
    <HostBookingManage bookingId={booking.id} status={booking.status} locale={locale} className={styles.manage}/>
    <BookingCancellationFlow bookingId={booking.id} status={booking.status} isOwner={true} totalPrice={Number(booking.total_price||0)} locale={locale}/>

    <section className={styles.card}>
      <div className={styles.infoRow}><div><span>{en?'Status':'Status'}</span><strong>{statusLabel(booking.status,en)}</strong></div></div>
      <div className={styles.divider}/>
      <div className={styles.infoRow}><div><span>{en?'Payment':'Betalning'}</span><strong>{booking.status==='accepted'?(en?'Waiting for renter':'Väntar på hyrestagaren'):['paid','active','returned','completed'].includes(booking.status)?(en?'Paid':'Betald'):booking.status==='refunded'?(en?'Refunded':'Återbetald'):'—'}</strong></div></div>
      <div className={styles.divider}/>
      <div className={styles.infoRow}><div><span>{en?'Booking date':'Bokningsdatum'}</span><strong>{new Intl.DateTimeFormat(en?'en-GB':'sv-SE',{day:'numeric',month:'short',year:'numeric'}).format(new Date(booking.created_at))}</strong></div></div>
      <div className={styles.divider}/>
      <div className={styles.infoRow}><div><span>{en?'Booking reference':'Bokningsreferens'}</span><strong>{reference}</strong></div></div>
      {booking.terms_version?<><div className={styles.divider}/><div className={styles.infoRow}><div><span>{en?'Terms version':'Villkorsversion'}</span><strong>{booking.terms_version}</strong></div></div></>:null}
    </section>

    <Link href={`/topsecret/${locale}/bokningar/${booking.id}/avtal`} className={styles.message}>{en?'View booking agreement':'Visa bokningsunderlag'}</Link>
    {booking.message?<section className={styles.card}><div className={styles.infoRow}><div><span>{en?'Message from renter':'Meddelande från hyrespersonen'}</span><strong>{booking.message}</strong></div></div></section>:null}
    <Link href={`/${locale}/vard/meddelanden`} className={styles.message}>{en?'Send message':'Skicka meddelande'}</Link>
  </main>;
}
