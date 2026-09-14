import Link from 'next/link';
import {redirect} from 'next/navigation';
import {getAdminAccess} from '@/lib/admin';
import AdminLogoutButton from '@/components/AdminLogoutButton';

export default async function AdminLayout({children,params}:{children:React.ReactNode;params:Promise<{locale:string}>}){
  const {locale}=await params;
  const access=await getAdminAccess();
  if(!access)redirect(`/${locale}/admin-inloggning`);
  return <><div style={{position:'fixed',right:18,bottom:72,zIndex:900}}><Link href={`/${locale}/admin/drift`} style={{display:'inline-flex',padding:'9px 12px',borderRadius:999,background:'#fff',border:'1px solid var(--line)',fontSize:12,fontWeight:800,textDecoration:'none',boxShadow:'0 4px 18px rgba(0,0,0,.08)'}}>Drift & larm</Link></div>{children}<AdminLogoutButton locale={locale}/></>;
}
