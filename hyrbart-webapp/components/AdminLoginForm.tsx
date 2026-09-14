'use client';
import {FormEvent,useState} from 'react';
import {useRouter} from 'next/navigation';

export default function AdminLoginForm({locale}:{locale:string}){
  const en=locale==='en';
  const router=useRouter();
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  const [mfaRequired,setMfaRequired]=useState(false);
  const [credentials,setCredentials]=useState<{username:string;password:string}|null>(null);

  async function submit(e:FormEvent<HTMLFormElement>){
    e.preventDefault(); setBusy(true); setError('');
    const form=new FormData(e.currentTarget);
    const username=String(form.get('username')||credentials?.username||'');
    const password=String(form.get('password')||credentials?.password||'');
    const secondFactor=String(form.get('secondFactor')||'');
    const res=await fetch('/api/admin/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username,password,secondFactor})});
    const data=await res.json().catch(()=>({}));
    if(data.mfaRequired){setCredentials({username,password});setMfaRequired(true);setBusy(false);return;}
    if(!res.ok){setError(mfaRequired?(en?'The verification code or recovery code was not accepted.':'Verifieringskoden eller återställningskoden godkändes inte.'):(en?'The username or password is incorrect, or the account cannot sign in.':'Användarnamnet eller lösenordet är fel, eller kontot kan inte logga in.'));setBusy(false);return;}
    if(data.mfaSetupRequired){router.replace(`/${locale}/admin-mfa`);router.refresh();return;}
    router.replace(`/${locale}/admin`); router.refresh();
  }

  return <form onSubmit={submit} style={{display:'grid',gap:14}}>
    {!mfaRequired?<>
      <label style={{display:'grid',gap:6,fontWeight:700}}>{en?'Admin username':'Admin-användarnamn'}<input name="username" autoComplete="username" required minLength={3} maxLength={64} style={{padding:'13px 14px',border:'1px solid var(--line)',borderRadius:12,fontSize:16}}/></label>
      <label style={{display:'grid',gap:6,fontWeight:700}}>{en?'Password':'Lösenord'}<input name="password" type="password" autoComplete="current-password" required style={{padding:'13px 14px',border:'1px solid var(--line)',borderRadius:12,fontSize:16}}/></label>
    </>:<>
      <p style={{margin:0}}>{en?'Enter the 6-digit code from your authenticator app. You can also use one of your one-time recovery codes.':'Ange den 6-siffriga koden från din autentiseringsapp. Du kan också använda en av dina engångskoder för återställning.'}</p>
      <label style={{display:'grid',gap:6,fontWeight:700}}>{en?'Verification or recovery code':'Verifierings- eller återställningskod'}<input name="secondFactor" autoComplete="one-time-code" required autoFocus style={{padding:'13px 14px',border:'1px solid var(--line)',borderRadius:12,fontSize:18}}/></label>
    </>}
    {error?<p role="alert" style={{margin:0,color:'#9b1c1c'}}>{error}</p>:null}
    <button disabled={busy} type="submit" style={{padding:'13px 16px',border:0,borderRadius:999,fontWeight:850,cursor:'pointer'}}>{busy?(en?'Signing in…':'Loggar in…'):(mfaRequired?(en?'Verify and sign in':'Verifiera och logga in'):(en?'Sign in to Admin':'Logga in i Admin'))}</button>
    {mfaRequired?<button type="button" onClick={()=>{setMfaRequired(false);setCredentials(null);setError('')}} style={{background:'none',border:0,textDecoration:'underline',cursor:'pointer'}}>{en?'Use another account':'Använd ett annat konto'}</button>:null}
  </form>;
}
