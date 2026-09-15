'use client';

import { FormEvent, useEffect, useState } from 'react';
import ImportDraftReview from '@/components/ImportDraftReview';
import styles from './ImportFlow.module.css';

type Batch={id:string;source_platform:'hygglo'|'other'|'user_provided';source_profile_url:string|null;status:string;created_at:string};
type Item={id:string;batch_id:string;source_reference:string|null;source_url:string|null;status:string;source_payload:Record<string,unknown>;normalized_data:Record<string,unknown>;field_confidence?:Record<string,string>;created_at:string};

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
      const response=await fetch('/api/imports/assisted/items',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({batchId:activeBatchId,sourceReference:reference.trim()||undefined,sourceUrl:sourceUrl.trim()||undefined,sourcePayload,normalizedData,fieldConfidence:{title:'user_provided',description:'user_provided',price:price.trim()?'user_provided':'missing',category:category.trim()?'user_provided':'missing'}})});
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

  return <div className={styles.flow}>
    <section className={`profileIdentityCard ${styles.card}`}>
      <span className={styles.eyebrow}>{en?'ASSISTED IMPORT':'ASSISTERAD IMPORT'}</span>
      <h2>{en?'Move existing listings without starting over':'Flytta befintliga annonser utan att börja om'}</h2>
      <p>{en?'You provide your own listing material. Hyrbart stores it as editable staging drafts and can later help structure and enrich it. Nothing is fetched automatically from Hygglo and nothing is published automatically.':'Du skickar själv in ditt befintliga annonsmaterial. Hyrbart sparar det som redigerbara staging-utkast och kan senare hjälpa till att strukturera och berika det. Inget hämtas automatiskt från Hygglo och inget publiceras automatiskt.'}</p>
      <form onSubmit={createBatch} className={styles.form}>
        <label className={styles.label}>{en?'Original source':'Ursprunglig källa'}<select value={sourcePlatform} onChange={e=>setSourcePlatform(e.target.value as typeof sourcePlatform)} className={styles.control}><option value="hygglo">Hygglo</option><option value="other">{en?'Other marketplace':'Annan marknadsplats'}</option><option value="user_provided">{en?'My own material':'Eget material'}</option></select></label>
        <label className={styles.label}>{en?'Profile/source URL (optional)':'Profil-/källänk (valfritt)'}<input type="url" value={sourceProfileUrl} onChange={e=>setSourceProfileUrl(e.target.value)} placeholder="https://www.hygglo.se/users/…" className={styles.input}/></label>
        <label className={styles.checkboxLabel}><input type="checkbox" checked={consentAccepted} onChange={e=>setConsentAccepted(e.target.checked)} className={styles.checkbox}/><span>{en?'I ask Hyrbart to process material that I provide myself in order to create editable listing drafts. I understand that nothing is published automatically and that this does not authorize Hyrbart to retrieve data from third-party services without separate support.':'Jag ber Hyrbart att behandla material som jag själv tillhandahåller för att skapa redigerbara annonsutkast. Jag förstår att inget publiceras automatiskt och att detta inte ger Hyrbart rätt att hämta data från tredjepartstjänster utan separat stöd.'}</span></label>
        <button type="submit" disabled={busy||!consentAccepted} className={`modeSwitchButton ${styles.actionButton}`}>{en?'Start import':'Starta import'}</button>
      </form>
    </section>

    {batches.length?<section className={`profileIdentityCard ${styles.card}`}>
      <h2 className={styles.heading}>{en?'Current import':'Aktuell import'}</h2>
      <label className={styles.label}>{en?'Import session':'Importsession'}<select value={activeBatchId} onChange={e=>setActiveBatchId(e.target.value)} className={styles.control}>{batches.map(batch=><option key={batch.id} value={batch.id}>{batch.source_platform==='hygglo'?'Hygglo':batch.source_platform==='other'?(en?'Other marketplace':'Annan marknadsplats'):(en?'Own material':'Eget material')} · {new Date(batch.created_at).toLocaleDateString(en?'en-GB':'sv-SE')}</option>)}</select></label>
      <form onSubmit={addItem} className={styles.form}>
        <label className={styles.label}>{en?'Title':'Rubrik'}<input required value={title} onChange={e=>setTitle(e.target.value)} className={styles.input}/></label>
        <label className={styles.label}>{en?'Description':'Beskrivning'}<textarea required value={description} onChange={e=>setDescription(e.target.value)} rows={6} className={styles.textarea}/></label>
        <div className={styles.columns}>
          <label className={styles.label}>{en?'Current price text':'Nuvarande pristext'}<input value={price} onChange={e=>setPrice(e.target.value)} placeholder={en?'e.g. 200 kr/day':'t.ex. 200 kr/dag'} className={styles.input}/></label>
          <label className={styles.label}>{en?'Category':'Kategori'}<input value={category} onChange={e=>setCategory(e.target.value)} placeholder={en?'e.g. Tools':'t.ex. Verktyg'} className={styles.input}/></label>
        </div>
        <label className={styles.label}>{en?'Original listing URL (optional)':'Ursprunglig annonslänk (valfritt)'}<input type="url" value={sourceUrl} onChange={e=>setSourceUrl(e.target.value)} placeholder="https://…" className={styles.input}/></label>
        <label className={styles.label}>{en?'Your reference (optional)':'Egen referens (valfritt)'}<input value={reference} onChange={e=>setReference(e.target.value)} placeholder={en?'Model, listing ID or internal note':'Modell, annons-ID eller intern referens'} className={styles.input}/></label>
        <button type="submit" disabled={busy||!activeBatchId} className={`modeSwitchButton ${styles.actionButton}`}>{busy?(en?'Saving…':'Sparar…'):(en?'Save staging draft':'Spara staging-utkast')}</button>
      </form>
    </section>:null}

    {activeBatchId?<section className={`profileIdentityCard ${styles.card}`}>
      <h2 className={styles.heading}>{en?'Review staging drafts':'Granska staging-utkast'}</h2>
      <p className={styles.heading}>{en?'Edit the draft, mark how trustworthy each field is, and attach your own images or documents. Everything remains private staging data.':'Redigera utkastet, markera hur säkert varje fält är och bifoga egna bilder eller dokument. Allt ligger fortsatt privat i staging.'}</p>
      {items.length?<div className={styles.reviewList}>{items.map(item=><ImportDraftReview key={item.id} item={item} locale={locale} onSaved={()=>loadItems(activeBatchId)}/>)}</div>:<div className={styles.empty}>{en?'No staging drafts yet.':'Inga staging-utkast ännu.'}</div>}
    </section>:null}

    {message?<p role="status" className={styles.message}>{message}</p>:null}
  </div>;
}
