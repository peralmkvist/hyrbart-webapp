'use client';
import {FormEvent,useState} from 'react';
import {useRouter} from 'next/navigation';

export default function AdminLoginForm({locale}:{locale:string}){
  const en=locale==='en';
  const router=useRouter();
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  async function submit(e:FormEvent<HTMLFormElement>){
    e.preventDefault(); setBusy(true); setError('');
    const form=new FormData(e.currentTarget);
    const res=await fetch('/api/admin/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username:form.get('username'),password:form.get('password')})});
    if(!res.ok){setError(en?'The username or password is incorrect, or the account cannot sign in.':'Användarnamnet eller lösenordet är fel, eller kontot kan inte logga in.');setBusy(false);return;}
    router.replace(`/${locale}/admin`); router.refresh();
  }
  return <form onSubmit={submit} style={{display:'grid',gap:14}}>
    <label style={{display:'grid',gap:6,fontWeight:700}}>{en?'Admin username':'Admin-användarnamn'}<input name="username" autoComplete="username" required minLength={3} maxLength={64} style={{padding:'13px 14px',border:'1px solid var(--line)',borderRadius:12,fontSize:16}}/></label>
    <label style={{display:'grid',gap:6,fontWeight:700}}>{en?'Password':'Lösenord'}<input name="password" type="password" autoComplete="current-password" required style={{padding:'13px 14px',border:'1px solid var(--line)',borderRadius:12,fontSize:16}}/></label>
    {error?<p role="alert" style={{margin:0,color:'#9b1c1c'}}>{error}</p>:null}
    <button disabled={busy} type="submit" style={{padding:'13px 16px',border:0,borderRadius:999,fontWeight:850,cursor:'pointer'}}>{busy?(en?'Signing in…':'Loggar in…'):(en?'Sign in to Admin':'Logga in i Admin')}</button>
  </form>;
}
