'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

type TotpFactor = { id:string; friendly_name?:string|null; status?:string };

export default function UserSecuritySettings({ locale }: { locale:string }) {
  const en = locale === 'en';
  const router = useRouter();
  const supabase = useMemo(()=>createClient(),[]);
  const [factors,setFactors]=useState<TotpFactor[]>([]);
  const [aal,setAal]=useState<string>('aal1');
  const [busy,setBusy]=useState(false);
  const [message,setMessage]=useState('');
  const [error,setError]=useState('');
  const [enroll,setEnroll]=useState<{factorId:string;qr:string;secret:string}|null>(null);
  const [code,setCode]=useState('');

  async function load(){
    setError('');
    const [factorResult,aalResult]=await Promise.all([
      supabase.auth.mfa.listFactors(),
      supabase.auth.mfa.getAuthenticatorAssuranceLevel(),
    ]);
    if(factorResult.error) throw factorResult.error;
    if(aalResult.error) throw aalResult.error;
    setFactors((factorResult.data?.totp||[]) as TotpFactor[]);
    setAal(aalResult.data?.currentLevel||'aal1');
  }

  useEffect(()=>{void load().catch(err=>setError(err instanceof Error?err.message:String(err)));},[]);

  async function beginEnroll(){
    setBusy(true);setError('');setMessage('');
    try{
      const {data,error}=await supabase.auth.mfa.enroll({factorType:'totp',friendlyName:'Hyrbart'});
      if(error)throw error;
      setEnroll({factorId:data.id,qr:data.totp.qr_code,secret:data.totp.secret});
      setCode('');
    }catch(err){setError(err instanceof Error?err.message:String(err));}
    finally{setBusy(false);}
  }

  async function verifyEnroll(event:FormEvent){
    event.preventDefault();
    if(!enroll||!/^\d{6}$/.test(code.trim()))return;
    setBusy(true);setError('');setMessage('');
    try{
      const challenge=await supabase.auth.mfa.challenge({factorId:enroll.factorId});
      if(challenge.error)throw challenge.error;
      const verified=await supabase.auth.mfa.verify({factorId:enroll.factorId,challengeId:challenge.data.id,code:code.trim()});
      if(verified.error)throw verified.error;
      setEnroll(null);setCode('');
      setMessage(en?'Authenticator app enabled. Other sessions were signed out by the auth provider.':'Autentiseringsapp aktiverad. Övriga sessioner loggades ut av auth-leverantören.');
      await load();router.refresh();
    }catch(err){setError(err instanceof Error?err.message:String(err));}
    finally{setBusy(false);}
  }

  async function disableFactor(factorId:string){
    setBusy(true);setError('');setMessage('');
    try{
      if(aal!=='aal2') throw new Error(en?'Verify your second factor in this session before disabling it.':'Verifiera din andra faktor i den här sessionen innan du stänger av den.');
      const {error}=await supabase.auth.mfa.unenroll({factorId});
      if(error)throw error;
      await supabase.auth.refreshSession();
      setMessage(en?'Authenticator factor removed.':'Autentiseringsfaktorn är borttagen.');
      await load();router.refresh();
    }catch(err){setError(err instanceof Error?err.message:String(err));}
    finally{setBusy(false);}
  }

  async function signOutOthers(){
    setBusy(true);setError('');setMessage('');
    try{
      const {error}=await supabase.auth.signOut({scope:'others'});
      if(error)throw error;
      setMessage(en?'All other sessions have been signed out.':'Alla andra sessioner har loggats ut.');
    }catch(err){setError(err instanceof Error?err.message:String(err));}
    finally{setBusy(false);}
  }

  const verified=factors.filter(f=>f.status==='verified');

  return <>
    <section className="profileSettingsCard">
      <div className="profileSettingsCardHeading"><span>2FA</span><h2>{verified.length?(en?'Authenticator app is enabled':'Autentiseringsapp är aktiverad'):(en?'Add an authenticator app':'Lägg till autentiseringsapp')}</h2></div>
      <p>{en?'TOTP adds a second factor after your email login link.':'TOTP lägger till en andra faktor efter din inloggningslänk via e-post.'}</p>
      <p><strong>{en?'Current session:':'Aktuell session:'}</strong> {aal==='aal2'?'AAL2':'AAL1'}</p>
      {!verified.length&&!enroll?<button className="profilePrimaryAction" type="button" onClick={beginEnroll} disabled={busy}>{en?'Enable authenticator app':'Aktivera autentiseringsapp'}</button>:null}
      {enroll?<form className="profileSettingsForm" onSubmit={verifyEnroll}>
        <div style={{display:'grid',placeItems:'center',background:'#fff',padding:12,borderRadius:16}}><img alt={en?'Authenticator QR code':'QR-kod för autentiseringsapp'} style={{width:220,maxWidth:'100%'}} src={enroll.qr}/></div>
        <label>{en?'Manual setup key':'Manuell nyckel'}<input readOnly value={enroll.secret}/></label>
        <label>{en?'6-digit code':'6-siffrig kod'}<input inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} value={code} onChange={e=>setCode(e.target.value.replace(/\D/g,''))}/></label>
        <button className="profilePrimaryAction" disabled={busy||code.length!==6}>{en?'Verify and enable':'Verifiera och aktivera'}</button>
      </form>:null}
      {verified.map(f=><div key={f.id} style={{display:'flex',justifyContent:'space-between',gap:12,alignItems:'center',marginTop:14}}><span>{f.friendly_name||'TOTP'}</span><button className="profileSecondaryAction" type="button" onClick={()=>disableFactor(f.id)} disabled={busy}>{en?'Disable':'Stäng av'}</button></div>)}
    </section>

    <section className="profileSettingsCard">
      <div className="profileSettingsCardHeading"><span>{en?'SESSIONS':'SESSIONER'}</span><h2>{en?'Signed-in devices':'Inloggade enheter'}</h2></div>
      <p>{en?'Supabase does not expose a safe end-user API for listing each session. You can securely revoke every other session while keeping this one.':'Supabase exponerar inget säkert slutanvändar-API för att lista varje enskild session. Du kan däremot säkert återkalla alla andra sessioner och behålla den här.'}</p>
      <button className="profileSecondaryAction" type="button" onClick={signOutOthers} disabled={busy}>{en?'Sign out all other devices':'Logga ut alla andra enheter'}</button>
    </section>

    {message?<p role="status" style={{marginTop:14}}>{message}</p>:null}
    {error?<p role="alert" className="authError" style={{marginTop:14}}>{error}</p>:null}
  </>;
}
