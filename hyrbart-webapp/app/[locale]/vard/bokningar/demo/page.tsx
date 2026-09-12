import Link from 'next/link';
import styles from './page.module.css';

export default async function DemoHostBookingPage({params}:{params:Promise<{locale:string}>}){
  const {locale}=await params;
  const en=locale==='en';
  return <main className={styles.page}>
    <header className={styles.topbar}>
      <Link href={`/${locale}/kalender`} className={styles.back} aria-label={en?'Back':'Tillbaka'}>‹</Link>
      <h1>{en?'Booking':'Bokning'}</h1>
    </header>

    <section className={styles.productCard}>
      <span>{en?'Product':'Produkt'}</span>
      <strong>Bosch</strong>
      <h2>GKS 18V-57 G</h2>
      <small>{en?'Circular saw':'Cirkelsåg'}</small>
    </section>

    <section className={styles.hero}>
      <img src="/images/demo-renter-avatar.svg" alt="Anna Lindberg" className={styles.avatar}/>
      <div><span>{en?'Rented by':'Hyresperson'}</span><h2>Anna Lindberg</h2></div>
    </section>

    <section className={styles.card}>
      <div className={styles.split}><div><span>{en?'Pickup':'Utlämning'}</span><strong>22 sep.</strong><small>09:00</small></div><div><span>{en?'Return':'Återlämning'}</span><strong>24 sep.</strong><small>18:00</small></div></div>
      <div className={styles.total}><span>{en?'Total':'Totalsumma'}</span><strong>459 kr</strong></div>
    </section>

    <Link href="#" className={styles.manage}>{en?'Manage booking':'Hantera bokning'} <span>›</span></Link>

    <section className={styles.card}>
      <div className={styles.infoRow}><div><span>{en?'Booking date':'Bokningsdatum'}</span><strong>12 sep. 2026</strong></div></div>
      <div className={styles.divider}/>
      <div className={styles.infoRow}><div><span>{en?'Booking reference':'Bokningsreferens'}</span><strong>HYR-260912-A7K4</strong></div></div>
    </section>

    <Link href={`/${locale}/vard/meddelanden`} className={styles.message}>{en?'Send message':'Skicka meddelande'}</Link>
  </main>;
}
