import Link from 'next/link';
import { getProducts } from '@/lib/sanity-products';
import styles from './page.module.css';

export default async function DemoRenterBookingPage({params}:{params:Promise<{locale:string}>}){
  const {locale}=await params;
  const en=locale==='en';
  const products=await getProducts();
  const product=products.find(item=>item.brand==='Bosch'&&item.name==='GKS 18V-57 G')??products[0];
  const ownerName=product?.owner?.name||'Per Almkvist';
  const ownerImage=product?.owner?.profileImage;

  return <main className={styles.page}>
    <header className={styles.topbar}>
      <Link href={`/${locale}/kalender`} className={styles.back} aria-label={en?'Back':'Tillbaka'}>‹</Link>
      <h1>{en?'Booking':'Bokning'}</h1>
    </header>

    <section className={styles.productCard}>
      <span>{en?'Product':'Produkt'}</span>
      <strong>{product?.brand||'Bosch'}</strong>
      <h2>{product?.name||'GKS 18V-57 G'}</h2>
      <small>{en?(product?.typeEn||'Circular saw'):(product?.type||'Cirkelsåg')}</small>
    </section>

    <section className={styles.ownerCard}>
      {ownerImage?<img src={ownerImage} alt={ownerName} className={styles.ownerAvatarImage}/>:<div className={styles.ownerAvatar}>{ownerName.slice(0,1)}</div>}
      <div><span>{en?'Owner':'Uthyrare'}</span><h2>{ownerName}</h2></div>
    </section>

    <section className={styles.card}>
      <div className={styles.split}><div><span>{en?'Pickup':'Utlämning'}</span><strong>26 sep.</strong><small>09:00</small></div><div><span>{en?'Return':'Återlämning'}</span><strong>27 sep.</strong><small>18:00</small></div></div>
      <div className={styles.total}><span>{en?'Total':'Totalsumma'}</span><strong>279 kr</strong></div>
    </section>

    <section className={styles.card}>
      <div className={styles.infoRow}><div><span>{en?'Booking date':'Bokningsdatum'}</span><strong>12 sep. 2026</strong></div></div>
      <div className={styles.divider}/>
      <div className={styles.infoRow}><div><span>{en?'Booking reference':'Bokningsreferens'}</span><strong>HYR-260912-R8M2</strong></div></div>
    </section>

    <Link href={`/${locale}/meddelanden`} className={styles.message}>{en?'Send message':'Skicka meddelande'}</Link>
  </main>;
}
