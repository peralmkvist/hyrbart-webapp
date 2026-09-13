'use client';

import { useState } from 'react';

const REASONS = [
  ['harassment','Trakasserier eller kränkningar','Harassment or abusive content'],
  ['hate','Hat eller diskriminering','Hate or discrimination'],
  ['personal_data','Personuppgifter','Personal information'],
  ['false_information','Felaktiga uppgifter','False information'],
  ['irrelevant','Irrelevant innehåll','Irrelevant content'],
  ['other','Annat','Other'],
] as const;

export default function ReportReviewButton({reviewId,locale='sv'}:{reviewId:string;locale?:string}){
  const en=locale==='en';
  const [open,setOpen]=useState(false),[reason,setReason]=useState(''),[details,setDetails]=useState(''),[busy,setBusy]=useState(false),[message,setMessage]=useState('');

  async function submit(){
    if(!reason)return;
    setBusy(true);setMessage('');
    const res=await fetch(`/api/reviews/${reviewId}/report`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({reason,details})});
    const body=await res.json().catch(()=>({}));
    if(res.ok){setMessage(en?'Thanks. The review has been sent to moderation.':'Tack. Omdömet har skickats till moderering.');setOpen(false)}
    else if(res.status===401)setMessage(en?'Sign in to report a review.':'Logga in för att rapportera ett omdöme.');
    else if(res.status===409)setMessage(en?'You have already reported this review.':'Du har redan rapporterat det här omdömet.');
    else if(body.error==='DETAILS_REQUIRED')setMessage(en?'Please add a short description.':'Beskriv kort vad rapporten gäller.');
    else setMessage(en?'The report could not be sent. Please try again.':'Rapporten kunde inte skickas. Försök igen.');
    setBusy(false);
  }

  return <div className="reviewReportAction">
    <button type="button" className="reviewReportLink" onClick={()=>{setOpen(v=>!v);setMessage('')}}>{en?'Report review':'Rapportera omdöme'}</button>
    {open?<div className="reviewReportForm" role="dialog" aria-label={en?'Report review':'Rapportera omdöme'}>
      <label>{en?'Reason':'Orsak'}<select value={reason} onChange={e=>setReason(e.target.value)}><option value="">{en?'Select reason':'Välj orsak'}</option>{REASONS.map(([value,sv,labelEn])=><option key={value} value={value}>{en?labelEn:sv}</option>)}</select></label>
      <label>{en?'Details (optional)':'Detaljer (valfritt)'}<textarea maxLength={1000} value={details} onChange={e=>setDetails(e.target.value)} placeholder={en?'Tell us what should be reviewed':'Beskriv vad vi bör granska'}/></label>
      <div><button type="button" disabled={busy||!reason} onClick={submit}>{busy?(en?'Sending…':'Skickar…'):(en?'Send report':'Skicka rapport')}</button><button type="button" onClick={()=>setOpen(false)}>{en?'Cancel':'Avbryt'}</button></div>
    </div>:null}
    {message?<small className="reviewReportMessage">{message}</small>:null}
  </div>;
}
