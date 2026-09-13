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

  return <div className="externalHistoryStack">
    <section className="externalHistoryCard">
      <div className="externalHistoryIntro">
        <h2>{en?'Bring your history':'Ta med din historik'}</h2>
        <p>{en?'If you already rent through another marketplace, submit your public profile. Hyrbart keeps external history separate from Hyrbart reviews and only displays figures we have verified.':'Om du redan hyr ut eller hyr via en annan marknadsplats kan du skicka in din offentliga profil. Hyrbart håller extern historik separat från Hyrbart-omdömen och visar bara uppgifter som vi har verifierat.'}</p>
      </div>

      <form onSubmit={submit} className="externalHistoryForm">
        <label className="externalHistoryField">
          <span>{en?'Platform':'Plattform'}</span>
          <select value={sourcePlatform} onChange={event=>setSourcePlatform(event.target.value as 'hygglo'|'other')}>
            <option value="hygglo">Hygglo</option><option value="other">{en?'Other':'Annan'}</option>
          </select>
        </label>
        <label className="externalHistoryField">
          <span>{en?'Public profile URL':'Länk till offentlig profil'}</span>
          <input type="url" required value={sourceProfileUrl} onChange={event=>setSourceProfileUrl(event.target.value)} placeholder="https://www.hygglo.se/users/…"/>
        </label>
        <div className="externalHistoryPair">
          <label className="externalHistoryField">
            <span>{en?'Rating (optional)':'Betyg (valfritt)'}</span>
            <input inputMode="decimal" value={claimedRating} onChange={event=>setClaimedRating(event.target.value)} placeholder="4,9"/>
          </label>
          <label className="externalHistoryField">
            <span>{en?'Reviews (optional)':'Omdömen (valfritt)'}</span>
            <input inputMode="numeric" value={claimedReviewCount} onChange={event=>setClaimedReviewCount(event.target.value)} placeholder="24"/>
          </label>
        </div>
        <small className="externalHistoryHint">{en?'The numbers you enter are only a hint for verification; they are never published as verified until checked by Hyrbart.':'Uppgifterna du fyller i används bara som stöd vid verifieringen och publiceras aldrig som verifierade innan Hyrbart har kontrollerat dem.'}</small>
        <button type="submit" disabled={busy} className="externalHistorySubmit">{busy?(en?'Submitting…':'Skickar…'):(en?'Submit for verification':'Skicka för verifiering')}</button>
        {message?<p role="status" className="externalHistoryMessage">{message}</p>:null}
      </form>
    </section>

    {claims.length?<section className="externalHistoryCard externalHistoryClaims"><h2>{en?'Submitted history':'Insänd historik'}</h2><div>{claims.map(claim=><a key={claim.id} href={claim.source_profile_url} target="_blank" rel="noreferrer"><div><strong>{claim.source_platform==='hygglo'?'Hygglo':(en?'Other platform':'Annan plattform')}</strong><span>{claim.status==='verified'&&claim.verified_rating!=null?`★ ${Number(claim.verified_rating).toFixed(1)} · ${claim.verified_review_count??0} ${en?'reviews':'omdömen'}`:claim.claimed_review_count!=null?`${claim.claimed_review_count} ${en?'claimed reviews':'angivna omdömen'}`:''}</span></div><b>{statusLabel(claim.status)}</b></a>)}</div></section>:null}
  </div>;
}
