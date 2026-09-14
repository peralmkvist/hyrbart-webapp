import AdminMfaSetup from '@/components/AdminMfaSetup';

export default async function AdminMfaPage({params}:{params:Promise<{locale:string}>}){
  const {locale}=await params;
  const en=locale==='en';
  return <section className="authPage">
    <div className="authShell">
      <div className="authLogo" aria-label="Hyrbart">Hyrbart</div>
      <span className="authEyebrow">{en?'Admin security':'Adminsäkerhet'}</span>
      <h1>{en?'Set up two-factor authentication':'Aktivera tvåstegsverifiering'}</h1>
      <p className="authIntro">{en?'Two-factor authentication is mandatory for Hyrbart administrators.':'Tvåstegsverifiering är obligatorisk för Hyrbarts administratörer.'}</p>
      <AdminMfaSetup locale={locale}/>
    </div>
  </section>;
}
