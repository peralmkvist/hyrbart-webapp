'use client';

import { FormEvent, useEffect, useState } from 'react';

type Batch={id:string;source_platform:'hygglo'|'other'|'user_provided';source_profile_url:string|null;status:string;created_at:string};
type Item={id:string;batch_id:string;source_reference:string|null;source_url:string|null;status:string;source_payload:Record<string,unknown>;normalized_data:Record<string,unknown>;created_at:string};

export default function ListingImportFlow({locale}:{locale:string}){
  const en=locale==='en';
  const [batches,setBatches]=useState<Batch[]>([]);
  const [activeBatchId,setActiveBatchId]=useState<string>('');
  const [items,setItems]=useState<Item[]>([]);
  const [sourcePlatform,setSourcePlatform]=useState<'hygglo'|'other'|'user_provided'>('hygglo');
  const [sourceProfileUrl,setSourceProfileUrl]=useState('');
  const [consentAccepted,setConsentAccepted]=useState(false);
  const [title,setTitle]=useState('');
  const [description,setDescription]=useState('');
  const [price,setPrice]=useState('');
  const [category,setCategory]=useState('');
  const [sourceUrl,setSourceUrl]=useState('');
  const [reference,setReference]=useState('');
  const [busy,setBusy]=useState(false);
  const [message,setMessage]=useState('');

  async function loadBatches(){
    const response=await fetch('/api/imports/assisted',{cache:'no-store'});
    if(!response.ok)return;
    const data=await response.json() as {batches?:Batch[]};
    const next=data.batches||[];
    setBatches(next);
    setActiveBatchId(current=>current||next[0]?.id||'');
  }

  async function loadItems(batchId:string){
    if(!batchId){setItems([]);return;}
    const response=await fetch(`/api/imports/assisted/items?batchId=${encodeURIComponent(batchId)}`,{cache:'no-store'});
    if(!response.ok)return;
    const data=await response.json() as {items?:Item[]};
    setItems(data.items||[]);
  }

  useEffect(()=>{void loadBatches();},[]);
  useEffect(()=>{void loadItems(activeBatchId);},[activeBatchId]);

  async function createBatch(event:FormEvent){
    event.preventDefault();setBusy(true);setMessage('');
    try{
      const response=await fetch('/api/imports/assisted',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sourcePlatform,sourceProfileUrl:sourceProfileUrl||null,consentAccepted})});
      const data=await response.json() as {error?:string;batch?:Batch};
      if(!response.ok){
        const copy:Record<string,string>={CONSENT_REQUIRED:en?'You need to approve the import terms first.':'Du behöver godkänna importvillkoren först.',INVALID_SOURCE_PROFILE_URL:en?'Use a valid HTTPS profile URL or leave it blank.':'Använd en giltig HTTPS-profillänk eller lämna fältet tomt.'};
        throw new Error(copy[data.error||'']||(en?'Could not start import.':'Kunde inte starta importen.'));
      }
      setConsentAccepted(false);setSourceProfileUrl('');setMessage(en?'Import session created. You can now add listings below.':'Importsession skapad. Nu kan du lägga till annonser nedan.');
      await loadBatches();
      if(data.batch?.id)setActiveBatchId(data.batch.id);
    }catch(error){setMessage(error instanceof Error?error.message:(en?'Something went wrong.':'Något gick fel.'));}
    finally{setBusy(false);}
  }

  async function addItem(event:FormEvent){
    event.preventDefault();
    if(!activeBatchId)return;
    setBusy(true);setMessage('');
    try{
      const sourcePayload={title:title.trim(),description:description.trim(),price:price.trim(),category:category.trim()};
      const normalizedData={title:title.trim(),description:description.trim(),price:price.trim(),category:category.trim()};
      const response=await fetch('/api/imports/assisted/items',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({batchId:activeBatchId,sourceReference:reference.trim()||undefined,sourceUrl:sourceUrl.trim()||undefined,sourcePayload,normalizedData,fieldConfidence:{title:'user_provided',description:'user_provided',price:'user_provided',category:category.trim()?'user_provided':'missing'}})});
      const data=await response.json() as {error?:string};
      if(!response.ok){
        const copy:Record<string,string>={DUPLICATE_IMPORT_ITEM:en?'This listing already exists in your import staging area.':'Den här annonsen finns redan i ditt importunderlag.',INVALID_SOURCE_URL:en?'Use a valid HTTPS listing URL or leave it blank.':'Använd en giltig HTTPS-annonslänk eller lämna fältet tomt.',SOURCE_DATA_REQUIRED:en?'Add at least some listing content.':'Lägg till åtminstone någon information om annonsen.'};
        throw new Error(copy[data.error||'']||(en?'Could not save listing.':'Kunde inte spara annonsen.'));
      }
      setTitle('');setDescription('');setPrice('');setCategory('');setSourceUrl('');setReference('');
      setMessage(en?'Saved as a staging draft. Nothing has been published.':'Sparad som staging-utkast. Ingenting har publicerats.');
      await loadItems(activeBatchId);
    }catch(error){setMessage(error instanceof Error?error.message:(en?'Something went wrong.':'Något gick fel.'));}
    finally{setBusy(false);}
  }

  return <div style={{display:'grid',gap:18}}>
    <section className="profileIdentityCard" style={{display:'block'}}>
      <span style={{fontSize:12,fontWeight:850,letterSpacing:'.08em'}}>{en?'ASSISTED IMPORT':'ASSISTERAD IMPORT'}</span>
      <h2>{en?'Move existing listings without starting over':'Flytta befintliga annonser utan att börja om'}</h2>
      <p>{en?'You provide your own listing material. Hyrbart stores it as editable staging drafts and can later help structure and enrich it. Nothing is fetched automatically from Hygglo and nothing is published automatically.':'Du skickar själv in ditt befintliga annonsmaterial. Hyrbart sparar det som redigerbara staging-utkast och kan senare hjälpa till att strukturera och berika det. Inget hämtas automatiskt från Hygglo och inget publiceras automatiskt.'}</p>
      <form onSubmit={createBatch} style={{display:'grid',gap:12,marginTop:18}}>
        <label style={{display:'grid',gap:6,fontWeight:700}}>{en?'Original source':'Ursprunglig källa'}<select value={sourcePlatform} onChange={e=>setSourcePlatform(e.target.value as typeof sourcePlatform)} style={{minHeight:48,border:'1px solid var(--line)',borderRadius:14,padding:'0 12px',background:'#fff'}}><option value="hygglo">Hygglo</option><option value="other">{en?'Other marketplace':'Annan marknadsplats'}</option><option value="user_provided">{en?'My own material':'Eget material'}</option></select></label>
        <label style={{display:'grid',gap:6,fontWeight:700}}>{en?'Profile/source URL (optional)':'Profil-/källänk (valfritt)'}<input type="url" value={sourceProfileUrl} onChange={e=>setSourceProfileUrl(e.target.value)} placeholder="https://www.hygglo.se/users/…" style={{minHeight:48,border:'1px solid var(--line)',borderRadius:14,padding:'0 12px'}}/></label>
        <label style={{display:'flex',gap:10,alignItems:'flex-start',fontSize:14,lineHeight:1.45}}><input type="checkbox" checked={consentAccepted} onChange={e=>setConsentAccepted(e.target.checked)} style={{marginTop:3}}/><span>{en?'I ask Hyrbart to process material that I provide myself in order to create editable listing drafts. I understand that nothing is published automatically and that this does not authorize Hyrbart to retrieve data from third-party services without separate support.':'Jag ber Hyrbart att behandla material som jag själv tillhandahåller för att skapa redigerbara annonsutkast. Jag förstår att inget publiceras automatiskt och att detta inte ger Hyrbart rätt att hämta data från tredjepartstjänster utan separat stöd.'}</span></label>
        <button type="submit" disabled={busy||!consentAccepted} className="modeSwitchButton" style={{border:0,cursor:'pointer'}}>{en?'Start import':'Starta import'}</button>
      </form>
    </section>

    {batches.length?<section className="profileIdentityCard" style={{display:'block'}}>
      <h2 style={{marginTop:0}}>{en?'Current import':'Aktuell import'}</h2>
      <label style={{display:'grid',gap:6,fontWeight:700}}>{en?'Import session':'Importsession'}<select value={activeBatchId} onChange={e=>setActiveBatchId(e.target.value)} style={{minHeight:48,border:'1px solid var(--line)',borderRadius:14,padding:'0 12px',background:'#fff'}}>{batches.map(batch=><option key={batch.id} value={batch.id}>{batch.source_platform==='hygglo'?'Hygglo':batch.source_platform==='other'?(en?'Other marketplace':'Annan marknadsplats'):(en?'Own material':'Eget material')} · {new Date(batch.created_at).toLocaleDateString(en?'en-GB':'sv-SE')}</option>)}</select></label>
      <form onSubmit={addItem} style={{display:'grid',gap:12,marginTop:18}}>
        <label style={{display:'grid',gap:6,fontWeight:700}}>{en?'Title':'Rubrik'}<input required value={title} onChange={e=>setTitle(e.target.value)} style={{minHeight:48,border:'1px solid var(--line)',borderRadius:14,padding:'0 12px'}}/></label>
        <label style={{display:'grid',gap:6,fontWeight:700}}>{en?'Description':'Beskrivning'}<textarea required value={description} onChange={e=>setDescription(e.target.value)} rows={6} style={{border:'1px solid var(--line)',borderRadius:14,padding:12,resize:'vertical'}}/></label>
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(180px,1fr))',gap:12}}>
          <label style={{display:'grid',gap:6,fontWeight:700}}>{en?'Current price text':'Nuvarande pristext'}<input value={price} onChange={e=>setPrice(e.target.value)} placeholder={en?'e.g. 200 kr/day':'t.ex. 200 kr/dag'} style={{minHeight:48,border:'1px solid var(--line)',borderRadius:14,padding:'0 12px'}}/></label>
          <label style={{display:'grid',gap:6,fontWeight:700}}>{en?'Category':'Kategori'}<input value={category} onChange={e=>setCategory(e.target.value)} placeholder={en?'e.g. Tools':'t.ex. Verktyg'} style={{minHeight:48,border:'1px solid var(--line)',borderRadius:14,padding:'0 12px'}}/></label>
        </div>
        <label style={{display:'grid',gap:6,fontWeight:700}}>{en?'Original listing URL (optional)':'Ursprunglig annonslänk (valfritt)'}<input type="url" value={sourceUrl} onChange={e=>setSourceUrl(e.target.value)} placeholder="https://…" style={{minHeight:48,border:'1px solid var(--line)',borderRadius:14,padding:'0 12px'}}/></label>
        <label style={{display:'grid',gap:6,fontWeight:700}}>{en?'Your reference (optional)':'Egen referens (valfritt)'}<input value={reference} onChange={e=>setReference(e.target.value)} placeholder={en?'Model, listing ID or internal note':'Modell, annons-ID eller intern referens'} style={{minHeight:48,border:'1px solid var(--line)',borderRadius:14,padding:'0 12px'}}/></label>
        <button type="submit" disabled={busy||!activeBatchId} className="modeSwitchButton" style={{border:0,cursor:'pointer'}}>{busy?(en?'Saving…':'Sparar…'):(en?'Save staging draft':'Spara staging-utkast')}</button>
      </form>
    </section>:null}

    {activeBatchId?<section className="profileIdentityCard" style={{display:'block'}}>
      <h2 style={{marginTop:0}}>{en?'Staging drafts':'Staging-utkast'}</h2>
      <p style={{marginTop:0}}>{en?'These are stored only in the import staging area. They are not live listings.':'Dessa ligger endast i importens staginglager. De är inte publicerade annonser.'}</p>
      {items.length?<div style={{display:'grid',gap:4}}>{items.map(item=>{
        const data=item.normalized_data||item.source_payload||{};
        const itemTitle=String(data.title||item.source_reference||(en?'Untitled draft':'Namnlöst utkast'));
        return <div key={item.id} style={{display:'grid',gridTemplateColumns:'1fr auto',gap:10,padding:'13px 0',borderBottom:'1px solid var(--line)'}}><div style={{minWidth:0}}><strong>{itemTitle}</strong><small style={{display:'block',marginTop:3,color:'var(--muted)'}}>{String(data.category||'')} {data.price?`· ${String(data.price)}`:''}</small></div><b>{en?'Draft':'Utkast'}</b></div>;
      })}</div>:<div style={{padding:'18px 0',color:'var(--muted)'}}>{en?'No staging drafts yet.':'Inga staging-utkast ännu.'}</div>}
    </section>:null}

    {message?<p role="status" style={{margin:0,fontWeight:750}}>{message}</p>:null}
  </div>;
}
