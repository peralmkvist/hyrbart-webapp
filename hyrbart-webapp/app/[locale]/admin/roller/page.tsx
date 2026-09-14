import Link from 'next/link';
import {redirect} from 'next/navigation';
import AdminRoleManager from '@/components/AdminRoleManager';
import {getAdminAccess} from '@/lib/admin';

export default async function AdminRolesPage({params}:{params:Promise<{locale:string}>}){
  const {locale}=await params;
  const access=await getAdminAccess('roles.manage');
  if(!access)redirect(`/${locale}`);
  return <main className="adminPage"><header className="adminHeader"><div><span>HYRBART SECURITY</span><h1>Roller & behörigheter</h1><p>Endast super_admin kan ändra administrativa roller.</p><Link href={`/${locale}/admin`}>← Adminöversikt</Link></div><div className="adminAvatar">H</div></header><AdminRoleManager/></main>;
}
