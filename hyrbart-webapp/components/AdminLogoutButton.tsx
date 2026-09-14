'use client';
import {useRouter} from 'next/navigation';
import {useState} from 'react';

export default function AdminLogoutButton({locale}:{locale:string}){
  const en=locale==='en';
  const router=useRouter();
  const [busy,setBusy]=useState(false);
  async function logout(){
    setBusy(true);
    await fetch('/api/admin/auth/logout',{method:'POST'}).catch(()=>null);
    router.replace(`/${locale}/admin-inloggning`);
    router.refresh();
  }
  return <button type="button" onClick={logout} disabled={busy} style={{position:'fixed',right:16,top:16,zIndex:50,border:'1px solid var(--line)',background:'#fff',borderRadius:999,padding:'9px 13px',fontWeight:800,cursor:'pointer'}}>{busy?(en?'Signing out…':'Loggar ut…'):(en?'Sign out Admin':'Logga ut Admin')}</button>;
}
