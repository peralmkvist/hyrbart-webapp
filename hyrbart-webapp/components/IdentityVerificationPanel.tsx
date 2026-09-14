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
      const response=await fetch('/api/identity-verification',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'});
      const body=await response.json().catch(()=>({}));
      if(response.status===503&&body.error==='PROVIDER_NOT_CONFIGURED')throw new Error(en?'Identity verification is not connected yet.':'Identitetsverifiering är ännu inte ansluten.');
      if(!response.ok)throw new Error(en?'Verification could not start.':'Verifieringen kunde inte startas.');
      await load();
    }catch(err){setError(err instanceof Error?err.message:String(err));}
    finally{setBusy(false);}
  }

  const status=state?.status||'unverified';
  const title:Record<string,string>=en?{
    unverified:'Not verified',pending:'Verification in progress',verified:'Identity verified',failed:'Verification failed',cancelled:'Verification cancelled',review_required:'Verification needs review',revoked:'Verification revoked'
  }:{
    unverified:'Inte verifierad',pending:'Verifiering pågår',verified:'Identiteten är verifierad',failed:'Verifieringen misslyckades',cancelled:'Verifieringen avbröts',review_required:'Verifieringen behöver granskas',revoked:'Verifieringen är återkallad'
  };
  const next:Record<string,string>=en?{
    unverified:'Start verification when a provider is connected.',pending:'No action is needed right now. The provider result will update this status server-side.',verified:'Your verified status is stored server-side. Hyrbart does not need to expose provider identity data here.',failed:'Try again when verification is available, or contact support if the problem remains.',cancelled:'You can start a new verification attempt.',review_required:'The result requires review. Do not start repeated attempts unless support asks you to.',revoked:'Your previous verification is no longer valid. A new verification will be required.'
  }:{
    unverified:'Starta verifiering när en leverantör är ansluten.',pending:'Du behöver inte göra något just nu. Leverantörens resultat uppdaterar statusen på serversidan.',verified:'Din verifierade status lagras på serversidan. Hyrbart behöver inte visa leverantörens identitetsdata här.',failed:'Försök igen när verifiering är tillgänglig, eller kontakta support om problemet kvarstår.',cancelled:'Du kan starta ett nytt verifieringsförsök.',review_required:'Resultatet behöver granskas. Starta inte upprepade försök om inte support ber dig.',revoked:'Din tidigare verifiering gäller inte längre. En ny verifiering kommer att krävas.'
  };
  const canRetry=['unverified','failed','cancelled','revoked'].includes(status);

  return <section className="profileSettingsCard">
    <div className="profileSettingsCardHeading"><span>{en?'IDENTITY':'IDENTITET'}</span><h2>{title[status]}</h2></div>
    <p>{next[status]}</p>
    {state?.provider?<p><strong>{en?'Provider:':'Leverantör:'}</strong> {state.provider}</p>:null}
    {state?.verifiedAt?<p><strong>{en?'Verified:':'Verifierad:'}</strong> {new Date(state.verifiedAt).toLocaleString(en?'en-GB':'sv-SE')}</p>:null}
    {!state?<p>{en?'Loading status…':'Läser status…'}</p>:null}
    {state&&canRetry&&state.configuredProvider?<button type="button" className="profilePrimaryAction" onClick={start} disabled={busy}>{busy?(en?'Starting…':'Startar…'):(status==='unverified'?(en?'Start verification':'Starta verifiering'):(en?'Try again':'Försök igen'))}</button>:null}
    {state&&canRetry&&!state.configuredProvider?<p><strong>{en?'Not connected yet.':'Inte ansluten ännu.'}</strong> {en?'Hyrbart will enable this action when the production identity provider has been selected and configured.':'Hyrbart aktiverar åtgärden när produktionsleverantören för identitetsverifiering har valts och konfigurerats.'}</p>:null}
    {error?<p role="alert" className="authError">{error}</p>:null}
  </section>;
}
