'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import styles from './ImportFlow.module.css';

type Confidence='verified'|'user_provided'|'suggested'|'missing';
type Item={
  id:string;
  status:string;
  source_reference:string|null;
  source_url:string|null;
  normalized_data:Record<string,unknown>;
  field_confidence?:Record<string,string>;
};
type Asset={
  id:string;
  asset_kind:'image'|'document'|'other';
  source_filename:string|null;
  preview_url:string|null;
  metadata?:Record<string,unknown>;
};

const fieldNames=['title','description','price','category'] as const;

export default function ImportDraftReview({item,locale,onSaved}:{item:Item;locale:string;onSaved:()=>Promise<void>|void}){
  const en=locale==='en';
  const data=item.normalized_data||{};
  const [values,setValues]=useState({
    title:String(data.title||''),
    description:String(data.description||''),
    price:String(data.price||''),
    category:String(data.category||''),
    sourceUrl:item.source_url||'',
    reference:item.source_reference||'',
  });
  const [confidence,setConfidence]=useState<Record<string,Confidence>>(()=>Object.fromEntries(fieldNames.map(key=>{
    const raw=item.field_confidence?.[key];
    const safe:Confidence=raw==='verified'||raw==='suggested'||raw==='missing'?'verified'===raw?'verified':raw:'user_provided';
    return [key,safe];
  })));
  const [assets,setAssets]=useState<Asset[]>([]);
  const [file,setFile]=useState<File|null>(null);
  const [rightsConfirmed,setRightsConfirmed]=useState(false);
  const [busy,setBusy]=useState(false);
  const [assetBusy,setAssetBusy]=useState(false);
  const [message,setMessage]=useState('');

  async function loadAssets(){
    const response=await fetch(`/api/imports/assisted/assets?itemId=${encodeURIComponent(item.id)}`,{cache:'no-store'});
    if(!response.ok)return;
    const payload=await response.json() as {assets?:Asset[]};
    setAssets(payload.assets||[]);
  }
  useEffect(()=>{void loadAssets();},[item.id]);

  function confidenceLabel(value:Confidence){
    if(en)return value==='verified'?'Verified':value==='user_provided'?'User provided':value==='suggested'?'Suggested':'Missing';
    return value==='verified'?'Verifierat':value==='user_provided'?'Användaruppgift':value==='suggested'?'Föreslaget':'Saknas';
  }

  function fieldLabel(key:string){return key==='title'?(en?'Title':'Rubrik'):key==='description'?(en?'Description':'Beskrivning'):key==='price'?(en?'Price text':'Pristext'):(en?'Category':'Kategori');}
  function setField(key:string,value:string){setValues(current=>({...current,[key]:value}));}

  const checklist=useMemo(()=>[
    ...fieldNames.map(key=>({key,label:fieldLabel(key),ok:Boolean(values[key].trim())&&confidence[key]!=='missing'})),
    {key:'image',label:en?'At least one image':'Minst en bild',ok:assets.some(asset=>asset.asset_kind==='image')},
  ],[values,confidence,assets,en]);
  const canMarkReady=checklist.every(item=>item.ok);

  async function persist(status:'draft'|'ready'){
    const nextConfidence={...confidence};
    for(const key of fieldNames){if(!values[key].trim())nextConfidence[key]='missing';}
    const response=await fetch('/api/imports/assisted/items',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({
      itemId:item.id,
      sourceReference:values.reference.trim()||null,
      sourceUrl:values.sourceUrl.trim()||null,
      normalizedData:{title:values.title.trim(),description:values.description.trim(),price:values.price.trim(),category:values.category.trim()},
      fieldConfidence:nextConfidence,
      status,
    })});
    const payload=await response.json() as {error?:string;readiness?:{missing?:string[]}};
    if(!response.ok){
      if(payload.error==='INVALID_SOURCE_URL')throw new Error(en?'Use a valid HTTPS source URL or leave it blank.':'Använd en giltig HTTPS-källänk eller lämna fältet tomt.');
      if(payload.error==='ITEM_NOT_READY')throw new Error(en?'The draft is not ready yet. Complete the checklist first.':'Utkastet är inte redo ännu. Slutför checklistan först.');
      throw new Error(en?'Could not save changes.':'Kunde inte spara ändringarna.');
    }
    setConfidence(nextConfidence);
    await onSaved();
  }

  async function save(event:FormEvent){
    event.preventDefault();setBusy(true);setMessage('');
    try{await persist('draft');setMessage(en?'Changes saved in staging.':'Ändringarna är sparade i staging.');}
    catch(error){setMessage(error instanceof Error?error.message:(en?'Something went wrong.':'Något gick fel.'));}
    finally{setBusy(false);}
  }

  async function markReady(){
    setBusy(true);setMessage('');
    try{await persist('ready');setMessage(en?'Ready for publication. Publication remains disabled while CMS restore is pending.':'Redo för publicering. Själva publiceringen är fortsatt avstängd medan CMS-återställningen pågår.');}
    catch(error){setMessage(error instanceof Error?error.message:(en?'Something went wrong.':'Något gick fel.'));}
    finally{setBusy(false);}
  }

  async function uploadAsset(event:FormEvent){
    event.preventDefault();
    if(!file||!rightsConfirmed)return;
    setAssetBusy(true);setMessage('');
    try{
      const form=new FormData();
      form.append('itemId',item.id);form.append('rightsConfirmed','true');form.append('file',file);
      const response=await fetch('/api/imports/assisted/assets',{method:'POST',body:form});
      const payload=await response.json() as {error?:string};
      if(!response.ok){
        const copy:Record<string,string>={
          FILE_TOO_LARGE:en?'The file may be at most 10 MB.':'Filen får vara högst 10 MB.',
          UNSUPPORTED_FILE_TYPE:en?'Use JPG, PNG, WebP, HEIC/HEIF or PDF.':'Använd JPG, PNG, WebP, HEIC/HEIF eller PDF.',
          DUPLICATE_ASSET:en?'That file is already attached.':'Den filen är redan bifogad.',
        };
        throw new Error(copy[payload.error||'']||(en?'Could not upload file.':'Kunde inte ladda upp filen.'));
      }
      setFile(null);setRightsConfirmed(false);setMessage(en?'File saved privately in staging.':'Filen är sparad privat i staging.');await loadAssets();
    }catch(error){setMessage(error instanceof Error?error.message:(en?'Something went wrong.':'Något gick fel.'));}
    finally{setAssetBusy(false);}
  }

  return <article className={styles.review}>
    <form onSubmit={save} className={styles.reviewForm}>
      <div className={styles.reviewHeader}><strong>{values.title||values.reference||(en?'Untitled draft':'Namnlöst utkast')}</strong><span className={`${styles.reviewStatus} ${item.status==='ready'?'':styles.reviewStatusDraft}`}>{item.status==='ready'?(en?'READY':'REDO'):(en?'STAGING':'STAGING')}</span></div>
      {fieldNames.map(key=><label key={key} className={styles.label}>
        <span className={styles.qualityRow}><span>{fieldLabel(key)}</span><select value={confidence[key]} onChange={e=>setConfidence(current=>({...current,[key]:e.target.value as Confidence}))} className={styles.qualitySelect} aria-label={`${key} quality`}><option value="verified">{confidenceLabel('verified')}</option><option value="user_provided">{confidenceLabel('user_provided')}</option><option value="suggested">{confidenceLabel('suggested')}</option><option value="missing">{confidenceLabel('missing')}</option></select></span>
        {key==='description'?<textarea value={values.description} onChange={e=>setField('description',e.target.value)} rows={5} className={styles.reviewTextarea}/>:<input value={values[key]} onChange={e=>setField(key,e.target.value)} className={styles.reviewInput}/>} 
      </label>)}
      <div className={styles.reviewColumns}><label className={styles.label}>{en?'Original URL':'Ursprunglig länk'}<input type="url" value={values.sourceUrl} onChange={e=>setField('sourceUrl',e.target.value)} className={styles.reviewInput}/></label><label className={styles.label}>{en?'Reference':'Referens'}<input value={values.reference} onChange={e=>setField('reference',e.target.value)} className={styles.reviewInput}/></label></div>
      <button type="submit" disabled={busy} className={`modeSwitchButton ${styles.actionButtonStart}`}>{busy?(en?'Saving…':'Sparar…'):(en?'Save review':'Spara granskning')}</button>
    </form>

    <section className={styles.panel}>
      <div><strong>{en?'Images & documents':'Bilder & dokument'}</strong><p className={styles.help}>{en?'Files remain private in import staging. They are not published.':'Filerna ligger privat i importens staging och publiceras inte.'}</p></div>
      {assets.length?<div className={styles.assetList}>{assets.map(asset=>asset.asset_kind==='image'&&asset.preview_url?<a key={asset.id} href={asset.preview_url} target="_blank" rel="noreferrer" className={styles.assetImageLink}><img src={asset.preview_url} alt={asset.source_filename||''} className={styles.assetImage}/></a>:<a key={asset.id} href={asset.preview_url||'#'} target={asset.preview_url?'_blank':undefined} rel="noreferrer" className={styles.assetDocument}>{asset.source_filename|| (en?'Document':'Dokument')}</a>)}</div>:<span className={styles.mutedSmall}>{en?'No files attached yet.':'Inga filer bifogade ännu.'}</span>}
      <form onSubmit={uploadAsset} className={styles.uploadForm}><input type="file" accept="image/jpeg,image/png,image/webp,image/heic,image/heif,application/pdf" onChange={e=>setFile(e.target.files?.[0]||null)}/><label className={styles.compactCheckboxLabel}><input type="checkbox" checked={rightsConfirmed} onChange={e=>setRightsConfirmed(e.target.checked)} className={styles.compactCheckbox}/><span>{en?'I confirm that I have the right to use this file in my Hyrbart listing.':'Jag bekräftar att jag har rätt att använda filen i min Hyrbart-annons.'}</span></label><button type="submit" disabled={assetBusy||!file||!rightsConfirmed} className={`modeSwitchButton ${styles.actionButtonStart}`}>{assetBusy?(en?'Uploading…':'Laddar upp…'):(en?'Attach file':'Bifoga fil')}</button></form>
    </section>

    <section className={styles.panel}>
      <div><strong>{en?'Ready for publication':'Redo för publicering'}</strong><p className={styles.help}>{en?'Complete every requirement before the draft can be marked ready. This does not publish anything.':'Slutför alla krav innan utkastet kan markeras som redo. Detta publicerar ingenting.'}</p></div>
      <div className={styles.checklist}>{checklist.map(check=><div key={check.key} className={styles.checkItem}><span aria-hidden="true">{check.ok?'✓':'○'}</span><span>{check.label}</span></div>)}</div>
      <button type="button" onClick={markReady} disabled={busy||!canMarkReady} className={`modeSwitchButton ${styles.actionButtonStart} ${canMarkReady?'':styles.notAllowed}`}>{item.status==='ready'?(en?'Revalidate readiness':'Validera redo-status igen'):(en?'Mark ready for publication':'Markera som redo för publicering')}</button>
      {item.status==='ready'?<small className={styles.readyNote}>{en?'Ready in staging. CMS publication is still disabled.':'Redo i staging. CMS-publicering är fortfarande avstängd.'}</small>:null}
    </section>
    {message?<p role="status" className={styles.reviewMessage}>{message}</p>:null}
  </article>;
}
