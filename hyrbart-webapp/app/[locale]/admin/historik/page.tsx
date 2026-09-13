import Link from 'next/link';
import { redirect } from 'next/navigation';
import { requireAdmin } from '@/lib/admin';
import AdminReputationQueue from '@/components/AdminReputationQueue';

export default async function AdminHistory({params}:{params:Promise<{locale:string}>}){
  const {locale}=await params;
  const user=await requireAdmin();
  if(!user)redirect(`/${locale}`);
  return <main className="adminPage">
    <header className="adminHeader"><div><span>HYRBART TRUST</span><h1>Extern historik</h1><p>Verifiera historik som användare vill ta med från andra marknadsplatser.</p><Link href={`/${locale}/admin`} style={{display:'inline-block',marginTop:10}}>← Adminöversikt</Link></div><div className="adminAvatar">H</div></header>
    <AdminReputationQueue/>
  </main>;
}
