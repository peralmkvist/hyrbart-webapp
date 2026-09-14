import Link from 'next/link';
import {redirect} from 'next/navigation';
import AdminLoginForm from '@/components/AdminLoginForm';
import {getAdminAccess} from '@/lib/admin';

export default async function AdminLoginPage({params}:{params:Promise<{locale:string}>}){
  const {locale}=await params;
  const en=locale==='en';
  if(await getAdminAccess())redirect(`/${locale}/admin`);
  return <main style={{minHeight:'70vh',display:'grid',placeItems:'center',padding:'32px 18px'}}>
    <section style={{width:'min(460px,100%)',border:'1px solid var(--line)',borderRadius:24,padding:'28px',background:'#fff'}}>
      <span style={{fontSize:12,fontWeight:900,letterSpacing:'.08em'}}>HYRBART ADMIN</span>
      <h1 style={{marginBottom:8}}>{en?'Admin sign in':'Admininloggning'}</h1>
      <p style={{color:'var(--muted)',marginTop:0,marginBottom:22}}>{en?'This login is separate from your normal Hyrbart account session.':'Den här inloggningen är separat från din vanliga Hyrbart-session.'}</p>
      <AdminLoginForm locale={locale}/>
      <p style={{fontSize:13,color:'var(--muted)',marginTop:20}}>{en?'First admin setup?':'Första admininstallationen?'} <Link href={`/${locale}/admin-installning`}>{en?'Open setup':'Öppna installation'}</Link></p>
    </section>
  </main>;
}
