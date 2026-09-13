'use client';

import { FormEvent, useState } from 'react';

type ReferralResult={id:string;email:string;code:string;shareUrl:string};

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
      const data=await response.json() as ReferralResult&{error?:string};
      if(!response.ok)throw new Error(data.error||(en?'Could not create invitation.':'Kunde inte skapa inbjudan.'));
      setResult(data);
    }catch(err){setError(err instanceof Error?err.message:(en?'Something went wrong.':'Något gick fel.'));}
    finally{setBusy(false)}
  }

  const subject=encodeURIComponent(en?'Try Hyrbart – SEK 10 for your first rental':'Testa Hyrbart – 10 kr när du gjort din första uthyrning');
  const body=result?encodeURIComponent(en
    ?`I think you should try Hyrbart. Sign up through my link: ${result.shareUrl}\n\nWhen you complete your first rental as a host, we both receive SEK 10.`
    :`Jag tror att Hyrbart skulle passa dig. Registrera dig via min länk: ${result.shareUrl}\n\nNär du har genomfört din första uthyrning får vi båda 10 kr.`):'';

  return <>
    <section className="profileSettingsCard referralHeroCard">
      <span className="referralEyebrow">{en?'REFER A HOST':'VÄRVA EN UTHYRARE'}</span>
      <h2>{en?'SEK 10 to both of you':'10 kr till er båda'}</h2>
      <p>{en?'Invite someone who has something to rent out. When they sign up through your invitation and complete their first rental, you each receive SEK 10.':'Tipsa någon som har något att hyra ut. När personen registrerar sig via din inbjudan och genomför sin första uthyrning får ni 10 kr var.'}</p>
    </section>

    <section className="profileSettingsCard">
      <form className="profileSettingsForm" onSubmit={submit}>
        <label>{en?'Email address':'E-postadress'}<input type="email" required value={email} onChange={event=>setEmail(event.target.value)} placeholder="namn@exempel.se" autoComplete="email"/></label>
        <button className="profilePrimaryAction" type="submit" disabled={busy}>{busy?(en?'Creating invitation…':'Skapar inbjudan…'):(en?'Create invitation':'Skapa inbjudan')}</button>
      </form>
      {error?<p className="referralError">{error}</p>:null}
      {result?<div className="referralResult">
        <strong>{en?'Invitation ready':'Inbjudan är klar'}</strong>
        <p>{result.email}</p>
        <div className="referralShareRow"><input readOnly value={result.shareUrl}/><button type="button" onClick={()=>navigator.clipboard?.writeText(result.shareUrl)}>{en?'Copy':'Kopiera'}</button></div>
        <a className="profileSecondaryAction referralMailButton" href={`mailto:${encodeURIComponent(result.email)}?subject=${subject}&body=${body}`}>{en?'Open email':'Öppna e-post'}</a>
      </div>:null}
    </section>

    <section className="profileSettingsCard referralTermsCard">
      <h2>{en?'How it works':'Så fungerar det'}</h2>
      <ol><li>{en?'You create an invitation for their email address.':'Du skapar en inbjudan till personens e-postadress.'}</li><li>{en?'They register through your personal invitation link.':'Personen registrerar sig via din personliga inbjudningslänk.'}</li><li>{en?'After their first completed rental as a host, SEK 10 is credited to each of you.':'Efter personens första genomförda uthyrning som uthyrare tilldelas ni 10 kr var.'}</li></ol>
    </section>
  </>;
}
