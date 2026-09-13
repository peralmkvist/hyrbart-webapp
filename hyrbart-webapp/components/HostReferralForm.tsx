'use client';

import { FormEvent, useState } from 'react';

type ReferralResult={id:string;email:string;code:string;shareUrl:string;sent?:boolean;error?:string};

export default function HostReferralForm({locale}:{locale:string}){
  const en=locale==='en';
  const [email,setEmail]=useState('');
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  const [result,setResult]=useState<ReferralResult|null>(null);

  async function submit(event:FormEvent){
    event.preventDefault();
    const normalized=email.trim().toLowerCase();
    if(!normalized)return;
    setBusy(true);setError('');setResult(null);
    try{
      const response=await fetch('/api/referrals',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({email:normalized,locale})});
      const data=await response.json() as ReferralResult;
      if(!response.ok){
        if(data.shareUrl)setResult(data);
        throw new Error(data.error||(en?'Could not send invitation.':'Kunde inte skicka inbjudan.'));
      }
      setResult(data);
      setEmail('');
    }catch(err){setError(err instanceof Error?err.message:(en?'Something went wrong.':'Något gick fel.'));}
    finally{setBusy(false)}
  }

  return <>
    <section className="profileSettingsCard referralHeroCard">
      <span className="referralEyebrow">{en?'REFER A HOST':'VÄRVA EN UTHYRARE'}</span>
      <h2>{en?'SEK 10 to both of you':'10 kr till er båda'}</h2>
      <p>{en?'Invite someone who has something to rent out. When they sign up through your invitation and complete their first rental, you each receive SEK 10.':'Tipsa någon som har något att hyra ut. När personen registrerar sig via din inbjudan och genomför sin första uthyrning får ni 10 kr var.'}</p>
    </section>

    <section className="profileSettingsCard">
      <form className="profileSettingsForm" onSubmit={submit}>
        <label>{en?'Email address':'E-postadress'}<input type="email" required value={email} onChange={event=>setEmail(event.target.value)} placeholder="namn@exempel.se" autoComplete="email"/></label>
        <button className="profilePrimaryAction" type="submit" disabled={busy}>{busy?(en?'Sending invitation…':'Skickar inbjudan…'):(en?'Send invitation':'Skicka inbjudan')}</button>
      </form>
      {error?<p className="referralError">{error}</p>:null}
      {result?<div className="referralResult">
        <strong>{result.sent?(en?'Invitation sent':'Inbjudan skickad'):(en?'Invitation created':'Inbjudan skapad')}</strong>
        <p>{result.email}</p>
        {result.sent?<p>{en?'Hyrbart sent the invitation by email.':'Hyrbart har skickat inbjudan via e-post.'}</p>:null}
        <div className="referralShareRow"><input readOnly value={result.shareUrl}/><button type="button" onClick={()=>navigator.clipboard?.writeText(result.shareUrl)}>{en?'Copy link':'Kopiera länk'}</button></div>
      </div>:null}
    </section>

    <section className="profileSettingsCard referralTermsCard">
      <h2>{en?'How it works':'Så fungerar det'}</h2>
      <ol><li>{en?'Enter the person’s email address and Hyrbart sends the invitation.':'Ange personens e-postadress så skickar Hyrbart inbjudan.'}</li><li>{en?'They register through your personal invitation link.':'Personen registrerar sig via din personliga inbjudningslänk.'}</li><li>{en?'After their first completed rental as a host, SEK 10 is credited to each of you.':'Efter personens första genomförda uthyrning som uthyrare tilldelas ni 10 kr var.'}</li></ol>
    </section>
  </>;
}
