import Link from 'next/link';
import { getProducts } from '@/lib/sanity-products';
import { BackIcon, CheckIcon } from '@/components/Icons';

export default async function PublicProfilePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const en = locale === 'en';
  const products = await getProducts();
  const ownerProducts = products.filter(product => product.owner?.name === 'Per');
  const owner = ownerProducts[0]?.owner ?? products.find(product => product.owner)?.owner;
  const reviewCount = ownerProducts.reduce((sum, product) => sum + (product.reviewCount ?? 0), 0);
  const weightedRating = ownerProducts.reduce((sum, product) => sum + ((product.rating ?? 0) * (product.reviewCount ?? 0)), 0);
  const rating = reviewCount > 0 ? weightedRating / reviewCount : 4.94;

  return (
    <section className="ds2Page" style={{ paddingBottom: 120 }}>
      <header style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 28 }}>
        <Link href={`/${locale}/profil`} aria-label={en ? 'Back to profile' : 'Tillbaka till profil'} style={{ width: 42, height: 42, display: 'grid', placeItems: 'center', color: 'inherit' }}><BackIcon /></Link>
        <h1 style={{ margin: 0, fontSize: '1.55rem', letterSpacing: '-.035em' }}>{en ? 'Profile' : 'Profil'}</h1>
      </header>

      <div style={{ display: 'grid', justifyItems: 'center', textAlign: 'center', padding: '24px 16px 28px' }}>
        {owner?.profileImage
          ? <img src={owner.profileImage} alt={owner.name || 'Per'} style={{ width: 116, height: 116, borderRadius: '50%', objectFit: 'cover', background: '#eee' }} />
          : <div style={{ width: 116, height: 116, borderRadius: '50%', display: 'grid', placeItems: 'center', background: '#4b5054', color: '#fff', fontSize: '3rem', fontWeight: 800 }}>P</div>}
        <h2 style={{ margin: '18px 0 4px', fontSize: '2rem', lineHeight: 1 }}>{owner?.name || 'Per'}</h2>
        <p style={{ margin: 0, color: 'var(--muted)', fontSize: '1rem' }}>Danderyd, Sverige</p>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 14, fontWeight: 700 }}>
          <span style={{ width: 28, height: 28, borderRadius: 9, background: '#111', color: 'var(--accent)', display: 'grid', placeItems: 'center' }}><CheckIcon /></span>
          {en ? 'Verified with BankID' : 'Identifierad via BankID'}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, marginTop: 12 }}>
        <div style={{ background: '#fff', border: '1px solid var(--line)', borderRadius: 18, padding: '18px 12px', textAlign: 'center' }}><strong style={{ display: 'block', fontSize: '1.35rem' }}>12</strong><span style={{ color: 'var(--muted)', fontSize: '.78rem' }}>{en ? 'rentals' : 'hyror'}</span></div>
        <div style={{ background: '#fff', border: '1px solid var(--line)', borderRadius: 18, padding: '18px 12px', textAlign: 'center' }}><strong style={{ display: 'block', fontSize: '1.35rem' }}>{reviewCount || 8}</strong><span style={{ color: 'var(--muted)', fontSize: '.78rem' }}>{en ? 'reviews' : 'omdömen'}</span></div>
        <div style={{ background: '#fff', border: '1px solid var(--line)', borderRadius: 18, padding: '18px 12px', textAlign: 'center' }}><strong style={{ display: 'block', fontSize: '1.35rem' }}>{rating.toFixed(2).replace('.', ',')}</strong><span style={{ color: 'var(--muted)', fontSize: '.78rem' }}>{en ? 'rating' : 'betyg'}</span></div>
      </div>
    </section>
  );
}
