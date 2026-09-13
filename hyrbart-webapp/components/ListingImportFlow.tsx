'use client';

import { FormEvent, useEffect, useState } from 'react';

type Job={id:string;source_platform:'hygglo'|'other';source_url:string;status:string;target_sanity_id:string|null;error_message:string|null;created_at:string;updated_at:string};

const svStatus:Record<string,string>={pending:'Mottagen',processing:'Bearbetas',needs_review:'Behöver granskas',ready:'Redo att importeras',imported:'Importerad',rejected:'Avvisad',failed:'Misslyckades',cancelled:'Avbruten'};
const enStatus:Record<string,string>={pending:'Received',processing:'Processing',needs_review:'Needs review',ready:'Ready to import',imported:'Imported',rejected:'Rejected',failed:'Failed',cancelled:'Cancelled'};

export default function ListingImportFlow({locale}:{locale:string}){
  const en=locale==='en';
  const [jobs,setJobs]=useState<Job[]>([]);
  const [sourcePlatform,setSourcePlatform]=useState<'hygglo'|'other'>('hygglo');
  const [sourceUrl,setSourceUrl]=useState('');
  const [ownershipConfirmed,setOwnershipConfirmed]=useState(false);
  const [busy,setBusy]=useState(false);
  const [message,setMessage]=useState('');

  async function load(){
    const response=await fetch('/api/imports/listings',{cache:'no-store'});
    if(!response.ok)return;
    const data=await response.json() as {jobs?:Job[]};
    setJobs(data.jobs||[]);
  }
  useEffect(()=>{void load();},[]);

  async function submit(event:FormEvent){
    event.preventDefault();setBusy(true);setMessage('');
    try{
      const response=await fetch('/api/imports/listings',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sourcePlatform,sourceUrl,ownershipConfirmed})});
      const data=await response.json() as {error?:string};
      if(!response.ok){
        const copy:Record<string,string>={
          INVALID_SOURCE_URL:en?'Use a valid HTTPS listing URL. Hygglo imports must use a hygglo.se URL.':'Använd en giltig HTTPS-länk till annonsen. Hygglo-importer måste använda en hygglo.se-länk.',
          OWNERSHIP_CONFIRMATION_REQUIRED:en?'Confirm that the listing is yours and that you may reuse its content.':'Bekräfta att annonsen är din och att du får återanvända innehållet.',
          ALREADY_SUBMITTED:en?'That listing has already been added to your import queue.':'Den annonsen finns redan i din importkö.',
        };
        throw new Error(copy[data.error||'']||(en?'Could not add listing.':'Kunde inte lägga till annonsen.'));
      }
      setSourceUrl('');setOwnershipConfirmed(false);setMessage(en?'Added to your import queue.':'Tillagd i din importkö.');await load();
    }catch(error){setMessage(error instanceof Error?error.message:(en?'Something went wrong.':'Något gick fel.'));}
    finally{setBusy(false);}
  }

  const labels=en?enStatus:svStatus;
  return <div style={{display:'grid',gap:18}}>
    <section className="profileIdentityCard" style={{display:'block'}}>
      <span style={{fontSize:12,fontWeight:850,letterSpacing:'.08em'}}>{en?'IMPORT A LISTING':'IMPORTERA ANNONS'}</span>
      <h2>{en?'Start with what you already have':'Börja med det du redan har'}</h2>
      <p>{en?'Paste a link to one of your existing listings. Hyrbart will keep the import as a draft until the extracted information has been reviewed. Nothing is published automatically.':'Klistra in en länk till en av dina befintliga annonser. Hyrbart behåller importen som ett utkast tills den hämtade informationen har granskats. Ingenting publiceras automatiskt.'}</p>
      <form onSubmit={submit} style={{display:'grid',gap:12,marginTop:18}}>
        <label style={{display:'grid',gap:6,fontWeight:700}}>{en?'Source':'Källa'}<select value={sourcePlatform} onChange={event=>setSourcePlatform(event.target.value as 'hygglo'|'other')} style={{minHeight:48,border:'1px solid var(--line)',borderRadius:14,padding:'0 12px',background:'#fff'}}><option value="hygglo">Hygglo</option><option value="other">{en?'Other marketplace':'Annan marknadsplats'}</option></select></label>
        <label style={{display:'grid',gap:6,fontWeight:700}}>{en?'Listing URL':'Länk till annons'}<input type="url" required value={sourceUrl} onChange={event=>setSourceUrl(event.target.value)} placeholder="https://www.hygglo.se/i/…" style={{minHeight:48,border:'1px solid var(--line)',borderRadius:14,padding:'0 12px'}}/></label>
        <label style={{display:'flex',gap:10,alignItems:'flex-start',fontSize:14,lineHeight:1.4}}><input type="checkbox" checked={ownershipConfirmed} onChange={event=>setOwnershipConfirmed(event.target.checked)} style={{marginTop:3}}/><span>{en?'I confirm that this is my listing and that I have the right to reuse the content I submit to Hyrbart.':'Jag bekräftar att detta är min annons och att jag har rätt att återanvända det innehåll jag skickar in till Hyrbart.'}</span></label>
        <button type="submit" disabled={busy||!ownershipConfirmed} className="modeSwitchButton" style={{border:0,cursor:'pointer'}}>{busy?(en?'Adding…':'Lägger till…'):(en?'Add to import queue':'Lägg i importkön')}</button>
        {message?<p role="status" style={{margin:0,fontWeight:700}}>{message}</p>:null}
      </form>
    </section>

    <section className="profileIdentityCard" style={{display:'block'}}>
      <h2 style={{marginTop:0}}>{en?'Import queue':'Importkö'}</h2>
      <p style={{marginTop:0}}>{en?'The next stage will extract title, description, price, category and product facts into a review step before a Hyrbart draft is created.':'Nästa steg hämtar titel, beskrivning, pris, kategori och produktfakta till ett granskningssteg innan ett Hyrbart-utkast skapas.'}</p>
      {jobs.length?<div style={{display:'grid',gap:4}}>{jobs.map(job=><a key={job.id} href={job.source_url} target="_blank" rel="noreferrer" style={{display:'grid',gridTemplateColumns:'1fr auto',gap:10,padding:'13px 0',borderBottom:'1px solid var(--line)',color:'inherit',textDecoration:'none'}}><div style={{minWidth:0}}><strong>{job.source_platform==='hygglo'?'Hygglo':(en?'Other marketplace':'Annan marknadsplats')}</strong><small style={{display:'block',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',marginTop:3}}>{job.source_url}</small></div><b>{labels[job.status]||job.status}</b></a>)}</div>:<div style={{padding:'18px 0',color:'var(--muted)'}}>{en?'No listings in the queue yet.':'Inga annonser i kön ännu.'}</div>}
    </section>
  </div>;
}
