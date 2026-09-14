import Link from 'next/link';
import {redirect} from 'next/navigation';
import AdminBootstrapForm from '@/components/AdminBootstrapForm';
import {createClient} from '@/lib/supabase/server';
import {createAdminClient} from '@/lib/supabase/admin';

export default async function AdminSetupPage({params}:{params:Promise<{locale:string}>}){
  const {locale}=await params;
  const en=locale==='en';
  const s=await createClient();
  const {data:{user}}=await s.auth.getUser();
  const admin=createAdminClient();
  const {count}=await admin.from('admin_accounts').select('id',{count:'exact',head:true});
  if((count||0)>0)redirect(`/${locale}/admin-inloggning`);
  if(!user)redirect(`/${locale}/logga-in?next=/${locale}/admin-installning`);
  return <main style={{minHeight:'70vh',display:'grid',placeItems:'center',padding:'32px 18px'}}>
    <section style={{width:'min(520px,100%)',border:'1px solid var(--line)',borderRadius:24,padding:'28px',background:'#fff'}}>
      <span style={{fontSize:12,fontWeight:900,letterSpacing:'.08em'}}>HYRBART ADMIN · BOOTSTRAP</span>
      <h1 style={{marginBottom:8}}>{en?'Create the first admin login':'Skapa första admininloggningen'}</h1>
      <p style={{color:'var(--muted)',marginTop:0,marginBottom:22}}>{en?'This one-time setup uses your existing Hyrbart identity only to establish the first super admin. After setup, the normal user session no longer grants admin access.':'Den här engångsinstallationen använder din befintliga Hyrbart-identitet endast för att etablera första super-admin. Efter installationen ger den vanliga användarsessionen inte längre adminåtkomst.'}</p>
      <AdminBootstrapForm locale={locale}/>
      <p style={{fontSize:13,color:'var(--muted)',marginTop:20}}><Link href={`/${locale}/admin-inloggning`}>{en?'Back to admin sign in':'Till admininloggningen'}</Link></p>
    </section>
  </main>;
}
