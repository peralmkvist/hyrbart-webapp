import Link from 'next/link';
import { redirect } from 'next/navigation';
import { requireAdmin } from '@/lib/admin';
import AdminImportQueue from '@/components/AdminImportQueue';

export default async function AdminImports({params}:{params:Promise<{locale:string}>}){
  const {locale}=await params;
  const user=await requireAdmin();
  if(!user)redirect(`/${locale}`);
  return <main className="adminPage">
    <header className="adminHeader"><div><span>HYRBART MIGRATION</span><h1>Annonsimporter</h1><p>Bearbeta externa annonser till granskningsbara Hyrbart-utkast.</p><Link href={`/${locale}/admin`} style={{display:'inline-block',marginTop:10}}>← Adminöversikt</Link></div><div className="adminAvatar">H</div></header>
    <AdminImportQueue/>
  </main>;
}
