import Link from 'next/link';
import {redirect} from 'next/navigation';
import {getAdminAccess} from '@/lib/admin';
import AdminAccountManager from '@/components/AdminAccountManager';

export default async function AdminSecurityPage({params}:{params:Promise<{locale:string}>}){
  const {locale}=await params;
  const access=await getAdminAccess('roles.manage');
  if(!access)redirect(`/${locale}/admin`);
  return <main className="adminPage">
    <header className="adminHeader"><div><span>HYRBART SECURITY</span><h1>Admininloggning</h1><p>Separata adminkonton, lösenord, spärrar och sessioner. Vanliga Hyrbart-sessioner ger inte adminåtkomst.</p><Link href={`/${locale}/admin`} style={{display:'inline-block',marginTop:10}}>← Adminöversikt</Link></div><div className="adminAvatar">S</div></header>
    <AdminAccountManager/>
  </main>;
}
