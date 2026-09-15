'use client';

import { useEffect, useState } from 'react';

type State={
  status:'unverified'|'pending'|'verified'|'failed'|'cancelled'|'review_required'|'revoked';
  verified:boolean;
  provider:string|null;
  verifiedAt:string|null;
  configuredProvider:string|null;
  latestAttempt:{id:string;provider:string;status:string;failure_code?:string|null;started_at:string;completed_at?:string|null}|null;
};

export default function IdentityVerificationPanel({locale}:{locale:string}){
  const en=locale==='en';
  const [state,setState]=useState<State|null>(null);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');

  async function load(){
    const response=await fetch('/api/identity-verification',{cache:'no-store'});
    if(!response.ok)throw new Error(en?'Could not load verification status.':'Kunde inte läsa verifieringsstatus.');
    setState(await response.json());
  }
  useEffect(()=>{void load().catch(err=>setError(err instanceof Error?err.message:String(err)));},[]);

  async function start(){
    setBusy(true);setError('');
    try{
      const response=await fetch('/api/identity-verification',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({locale})});
      const body=await response.json().catch(()=>({}));
      if(response.status===503&&body.error==='PROVIDER_NOT_CONFIGURED')throw new Error(en?'Identity verification is not connected yet.':'Identitetsverifiering är ännu inte ansluten.');
      if(!response.ok)throw new Error(en?'Verification could not start.':'Verifieringen kunde inte startas.');
      if(typeof body.redirectUrl==='string'&&body.redirectUrl){
        window.location.assign(body.redirectUrl);
        return;
      }
      await load();
    }catch(err){setError(err instanceof Error?err.message:String(err));setBusy(false);}
  }

  const status=state?.status||'unverified';
  const title:Record<string,string>=en?{
    unverified:'Not verified',pending:'Verification in progress',verified:'Identity verified',failed:'Verification failed',cancelled:'Verification cancelled',review_required:'Verification needs review',revoked:'Verification revoked'
  }:{
    unverified:'Inte verifierad',pending:'Verifiering pågår',verified:'Identiteten är verifierad',failed:'Verifieringen misslyckades',cancelled:'Verifieringen avbröts',review_required:'Verifieringen behöver granskas',revoked:'Verifieringen är återkallad'
  };
  const next:Record<string,string>=en?{
    unverified:'Verify your identity securely with Swedish BankID.',pending:'A verification attempt is in progress. You can continue it with BankID.',verified:'Your identity has been verified. Hyrbart stores the verification result, not your BankID credentials.',failed:'The verification did not complete. Try again with BankID.',cancelled:'The verification was cancelled. You can start again when you are ready.',review_required:'The result requires review. Do not start repeated attempts unless support asks you to.',revoked:'Your previous verification is no longer valid. Verify again with BankID.'
  }:{
    unverified:'Verifiera din identitet säkert med svenskt BankID.',pending:'Ett verifieringsförsök pågår. Du kan fortsätta det med BankID.',verified:'Din identitet är verifierad. Hyrbart lagrar verifieringsresultatet, inte dina BankID-uppgifter.',failed:'Verifieringen slutfördes inte. Försök igen med BankID.',cancelled:'Verifieringen avbröts. Du kan starta igen när du vill.',review_required:'Resultatet behöver granskas. Starta inte upprepade försök om inte support ber dig.',revoked:'Din tidigare verifiering gäller inte längre. Verifiera dig igen med BankID.'
  };
  const canRetry=['unverified','pending','failed','cancelled','revoked'].includes(status);
  const bankIdConnected=state?.configuredProvider==='idura-bankid';

  return <section className="profileSettingsCard">
    <div className="profileSettingsCardHeading"><span>{en?'IDENTITY':'IDENTITET'}</span><h2>{title[status]}</h2></div>
    <p>{next[status]}</p>
    {state?.verifiedAt?<p><strong>{en?'Verified:':'Verifierad:'}</strong> {new Date(state.verifiedAt).toLocaleString(en?'en-GB':'sv-SE')}</p>:null}
    {!state?<p>{en?'Loading status…':'Läser status…'}</p>:null}
    {state&&canRetry&&bankIdConnected?<button type="button" className="profilePrimaryAction" onClick={start} disabled={busy}>{busy?(en?'Opening BankID…':'Öppnar BankID…'):(en?'Verify with BankID':'Verifiera med BankID')}</button>:null}
    {state&&canRetry&&!state.configuredProvider?<p><strong>{en?'Not connected yet.':'Inte ansluten ännu.'}</strong> {en?'Hyrbart will enable this action when the identity provider has been configured.':'Hyrbart aktiverar åtgärden när identitetsleverantören har konfigurerats.'}</p>:null}
    {error?<p role="alert" className="authError">{error}</p>:null}
  </section>;
}
