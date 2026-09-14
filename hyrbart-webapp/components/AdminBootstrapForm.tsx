'use client';
import {FormEvent,useState} from 'react';
import {useRouter} from 'next/navigation';

export default function AdminBootstrapForm({locale}:{locale:string}){
  const en=locale==='en';
  const router=useRouter();
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  async function submit(e:FormEvent<HTMLFormElement>){
    e.preventDefault(); setBusy(true); setError('');
    const form=new FormData(e.currentTarget);
    const password=String(form.get('password')||'');
    const confirm=String(form.get('confirm')||'');
    if(password!==confirm){setError(en?'Passwords do not match.':'Lösenorden matchar inte.');setBusy(false);return;}
    const res=await fetch('/api/admin/auth/bootstrap',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username:form.get('username'),password})});
    const body=await res.json().catch(()=>({}));
    if(!res.ok){
      const message=body.error==='BOOTSTRAP_CLOSED'?(en?'Admin bootstrap is already closed. Use the admin login page.':'Admin-bootstrap är redan stängd. Använd admininloggningen.'):body.error==='PASSWORD_TOO_SHORT'?(en?'Use at least 12 characters.':'Använd minst 12 tecken.'):(en?'Admin setup could not be completed.':'Admininstallationen kunde inte slutföras.');
      setError(message);setBusy(false);return;
    }
    router.replace(`/${locale}/admin-mfa`); router.refresh();
  }
  return <form onSubmit={submit} style={{display:'grid',gap:14}}>
    <label style={{display:'grid',gap:6,fontWeight:700}}>{en?'Choose admin username':'Välj admin-användarnamn'}<input name="username" autoComplete="username" required pattern="[a-z0-9._-]{3,64}" minLength={3} maxLength={64} style={{padding:'13px 14px',border:'1px solid var(--line)',borderRadius:12,fontSize:16}}/></label>
    <label style={{display:'grid',gap:6,fontWeight:700}}>{en?'Choose password':'Välj lösenord'}<input name="password" type="password" autoComplete="new-password" required minLength={12} style={{padding:'13px 14px',border:'1px solid var(--line)',borderRadius:12,fontSize:16}}/></label>
    <label style={{display:'grid',gap:6,fontWeight:700}}>{en?'Repeat password':'Upprepa lösenord'}<input name="confirm" type="password" autoComplete="new-password" required minLength={12} style={{padding:'13px 14px',border:'1px solid var(--line)',borderRadius:12,fontSize:16}}/></label>
    <p style={{margin:0,color:'var(--muted)',fontSize:14}}>{en?'After this step you must activate two-factor authentication before Admin can be used.':'Efter detta steg måste du aktivera tvåstegsverifiering innan Admin kan användas.'}</p>
    {error?<p role="alert" style={{margin:0,color:'#9b1c1c'}}>{error}</p>:null}
    <button disabled={busy} type="submit" style={{padding:'13px 16px',border:0,borderRadius:999,fontWeight:850,cursor:'pointer'}}>{busy?(en?'Creating…':'Skapar…'):(en?'Create first admin login':'Skapa första admininloggningen')}</button>
  </form>;
}
