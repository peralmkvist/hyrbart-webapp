'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function UserMfaChallenge({locale}:{locale:string}){
  const en=locale==='en';
  const router=useRouter();
  const supabase=useMemo(()=>createClient(),[]);
  const [factorId,setFactorId]=useState('');
  const [code,setCode]=useState('');
  const [error,setError]=useState('');
  const [busy,setBusy]=useState(false);

  useEffect(()=>{void (async()=>{
    const factors=await supabase.auth.mfa.listFactors();
    if(factors.error){setError(factors.error.message);return;}
    const verified=(factors.data?.totp||[]).find(f=>f.status==='verified');
    if(!verified){router.replace(`/topsecret/${locale}/vard/profil/sakerhet`);return;}
    setFactorId(verified.id);
  })();},[locale,router,supabase]);

  async function submit(event:FormEvent){
    event.preventDefault();
    if(!factorId||code.length!==6)return;
    setBusy(true);setError('');
    try{
      const challenge=await supabase.auth.mfa.challenge({factorId});
      if(challenge.error)throw challenge.error;
      const verified=await supabase.auth.mfa.verify({factorId,challengeId:challenge.data.id,code});
      if(verified.error)throw verified.error;
      router.replace(`/topsecret/${locale}/profil`);
      router.refresh();
    }catch(err){setError(err instanceof Error?err.message:String(err));}
    finally{setBusy(false);}
  }

  return <form className="authCard" onSubmit={submit}>
    <label className="authField"><span>{en?'6-digit authenticator code':'6-siffrig kod från autentiseringsappen'}</span><input autoFocus inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} value={code} onChange={e=>setCode(e.target.value.replace(/\D/g,''))}/></label>
    <button className="authPrimary" disabled={busy||!factorId||code.length!==6}>{busy?(en?'Verifying…':'Verifierar…'):(en?'Verify':'Verifiera')}</button>
    {error?<p role="alert" className="authError">{error}</p>:null}
  </form>;
}
