import {redirect} from 'next/navigation';
import {getAdminAccess} from '@/lib/admin';
import AdminLogoutButton from '@/components/AdminLogoutButton';

export default async function AdminLayout({children,params}:{children:React.ReactNode;params:Promise<{locale:string}>}){
  const {locale}=await params;
  const access=await getAdminAccess();
  if(!access)redirect(`/${locale}/admin-inloggning`);
  return <>{children}<AdminLogoutButton locale={locale}/></>;
}
