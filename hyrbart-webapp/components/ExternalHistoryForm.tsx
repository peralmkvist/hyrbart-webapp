'use client';

import { FormEvent, useEffect, useState } from 'react';

type Claim={
  id:string;source_platform:'hygglo'|'other';source_profile_url:string;
  claimed_rating:number|null;claimed_review_count:number|null;status:'pending'|'verified'|'rejected';
  verified_rating:number|null;verified_review_count:number|null;verified_at:string|null;created_at:string;
};

export default function ExternalHistoryForm({locale}:{locale:string}){
  const en=locale==='en';
  const [claims,setClaims]=useState<Claim[]>([]);
  const [sourcePlatform,setSourcePlatform]=useState<'hygglo'|'other'>('hygglo');
  const [sourceProfileUrl,setSourceProfileUrl]=useState('');
  const [claimedRating,setClaimedRating]=useState('');
  const [claimedReviewCount,setClaimedReviewCount]=useState('');
  const [busy,setBusy]=useState(false);
  const [message,setMessage]=useState('');

  async function load(){
    const response=await fetch('/api/reputation/external',{cache:'no-store'});
    if(!response.ok)return;
    const data=await response.json() as {claims?:Claim[]};
    setClaims(data.claims||[]);
  }
  useEffect(()=>{void load();},[]);

  async function submit(event:FormEvent){
    event.preventDefault();setBusy(true);setMessage('');
    try{
      const response=await fetch('/api/reputation/external',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sourcePlatform,sourceProfileUrl,claimedRating:claimedRating||null,claimedReviewCount:claimedReviewCount||null})});
      const data=await response.json() as {error?:string};
      if(!response.ok){
        const copy:Record<string,string>={
          INVALID_PROFILE_URL:en?'Use a valid HTTPS profile URL. For Hygglo, use a hygglo.se profile URL.':'Använd en giltig HTTPS-länk till profilen. För Hygglo ska länken gå till hygglo.se.',
          ALREADY_SUBMITTED:en?'This profile has already been submitted.':'Den här profilen har redan skickats in.',
          INVALID_RATING:en?'Rating must be between 1 and 5.':'Betyget måste vara mellan 1 och 5.',
          INVALID_REVIEW_COUNT:en?'Review count must be a whole number.':'Antal omdömen måste vara ett heltal.',
        };
        throw new Error(copy[data.error||'']||(en?'Could not submit history.':'Kunde inte skicka in historiken.'));
      }
      setSourceProfileUrl('');setClaimedRating('');setClaimedReviewCount('');
      setMessage(en?'Submitted for verification.':'Skickat för verifiering.');
      await load();
    }catch(error){setMessage(error instanceof Error?error.message:(en?'Something went wrong.':'Något gick fel.'));}
    finally{setBusy(false);}
  }

  const statusLabel=(status:Claim['status'])=>status==='verified'?(en?'Verified':'Verifierad'):status==='rejected'?(en?'Could not verify':'Kunde inte verifieras'):(en?'Verification pending':'Väntar på verifiering');

  return <div style={{display:'grid',gap:18}}>
    <section className="profileIdentityCard" style={{display:'block'}}>
      <h2 style={{marginTop:0}}>{en?'Bring your history':'Ta med din historik'}</h2>
      <p>{en?'If you already rent through another marketplace, submit your public profile. Hyrbart keeps external history separate from Hyrbart reviews and only displays figures we have verified.':'Om du redan hyr ut eller hyr via en annan marknadsplats kan du skicka in din offentliga profil. Hyrbart håller extern historik separat från Hyrbart-omdömen och visar bara uppgifter som vi har verifierat.'}</p>
      <form onSubmit={submit} style={{display:'grid',gap:12,marginTop:18}}>
        <label style={{display:'grid',gap:6,fontWeight:700}}>{en?'Platform':'Plattform'}<select value={sourcePlatform} onChange={event=>setSourcePlatform(event.target.value as 'hygglo'|'other')} style={{minHeight:48,border:'1px solid var(--line)',borderRadius:14,padding:'0 12px',background:'#fff'}}><option value="hygglo">Hygglo</option><option value="other">{en?'Other':'Annan'}</option></select></label>
        <label style={{display:'grid',gap:6,fontWeight:700}}>{en?'Public profile URL':'Länk till offentlig profil'}<input type="url" required value={sourceProfileUrl} onChange={event=>setSourceProfileUrl(event.target.value)} placeholder="https://www.hygglo.se/users/…" style={{minHeight:48,border:'1px solid var(--line)',borderRadius:14,padding:'0 12px'}}/></label>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
          <label style={{display:'grid',gap:6,fontWeight:700}}>{en?'Rating (optional)':'Betyg (valfritt)'}<input inputMode="decimal" value={claimedRating} onChange={event=>setClaimedRating(event.target.value)} placeholder="4,9" style={{minHeight:48,border:'1px solid var(--line)',borderRadius:14,padding:'0 12px'}}/></label>
          <label style={{display:'grid',gap:6,fontWeight:700}}>{en?'Reviews (optional)':'Omdömen (valfritt)'}<input inputMode="numeric" value={claimedReviewCount} onChange={event=>setClaimedReviewCount(event.target.value)} placeholder="24" style={{minHeight:48,border:'1px solid var(--line)',borderRadius:14,padding:'0 12px'}}/></label>
        </div>
        <small>{en?'The numbers you enter are only a hint for verification; they are never published as verified until checked by Hyrbart.':'Uppgifterna du fyller i används bara som stöd vid verifieringen och publiceras aldrig som verifierade innan Hyrbart har kontrollerat dem.'}</small>
        <button type="submit" disabled={busy} className="modeSwitchButton" style={{border:0,cursor:'pointer'}}>{busy?(en?'Submitting…':'Skickar…'):(en?'Submit for verification':'Skicka för verifiering')}</button>
        {message?<p role="status" style={{margin:0,fontWeight:700}}>{message}</p>:null}
      </form>
    </section>

    {claims.length?<section className="profileIdentityCard" style={{display:'block'}}><h2 style={{marginTop:0}}>{en?'Submitted history':'Insänd historik'}</h2><div style={{display:'grid',gap:10}}>{claims.map(claim=><a key={claim.id} href={claim.source_profile_url} target="_blank" rel="noreferrer" style={{display:'flex',justifyContent:'space-between',gap:12,color:'inherit',textDecoration:'none',padding:'12px 0',borderBottom:'1px solid var(--line)'}}><div><strong>{claim.source_platform==='hygglo'?'Hygglo':(en?'Other platform':'Annan plattform')}</strong><div style={{fontSize:13,color:'var(--muted)',marginTop:3}}>{claim.status==='verified'&&claim.verified_rating!=null?`★ ${Number(claim.verified_rating).toFixed(1)} · ${claim.verified_review_count??0} ${en?'reviews':'omdömen'}`:claim.claimed_review_count!=null?`${claim.claimed_review_count} ${en?'claimed reviews':'angivna omdömen'}`:''}</div></div><span style={{fontWeight:800}}>{statusLabel(claim.status)}</span></a>)}</div></section>:null}
  </div>;
}
