'use client';

import { FormEvent, useEffect, useState } from 'react';

type Confidence='verified'|'user_provided'|'suggested'|'missing';
type Item={
  id:string;
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

  function setField(key:string,value:string){setValues(current=>({...current,[key]:value}));}

  async function save(event:FormEvent){
    event.preventDefault();setBusy(true);setMessage('');
    try{
      const nextConfidence={...confidence};
      for(const key of fieldNames){if(!values[key].trim())nextConfidence[key]='missing';}
      const response=await fetch('/api/imports/assisted/items',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({
        itemId:item.id,
        sourceReference:values.reference.trim()||null,
        sourceUrl:values.sourceUrl.trim()||null,
        normalizedData:{title:values.title.trim(),description:values.description.trim(),price:values.price.trim(),category:values.category.trim()},
        fieldConfidence:nextConfidence,
      })});
      const payload=await response.json() as {error?:string};
      if(!response.ok)throw new Error(payload.error==='INVALID_SOURCE_URL'?(en?'Use a valid HTTPS source URL or leave it blank.':'Använd en giltig HTTPS-källänk eller lämna fältet tomt.'):(en?'Could not save changes.':'Kunde inte spara ändringarna.'));
      setConfidence(nextConfidence);setMessage(en?'Changes saved in staging.':'Ändringarna är sparade i staging.');await onSaved();
    }catch(error){setMessage(error instanceof Error?error.message:(en?'Something went wrong.':'Något gick fel.'));}
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

  const inputStyle={minHeight:44,border:'1px solid var(--line)',borderRadius:12,padding:'0 11px',background:'#fff'} as const;
  const qualityStyle={minHeight:38,border:'1px solid var(--line)',borderRadius:10,padding:'0 9px',background:'#fff',fontSize:13} as const;

  return <article style={{borderTop:'1px solid var(--line)',paddingTop:18,display:'grid',gap:16}}>
    <form onSubmit={save} style={{display:'grid',gap:12}}>
      <div style={{display:'flex',justifyContent:'space-between',gap:12,alignItems:'baseline'}}><strong>{values.title||values.reference||(en?'Untitled draft':'Namnlöst utkast')}</strong><span style={{fontSize:12,fontWeight:800,color:'var(--muted)'}}>{en?'STAGING':'STAGING'}</span></div>
      {fieldNames.map(key=><label key={key} style={{display:'grid',gap:6,fontWeight:700}}>
        <span style={{display:'flex',justifyContent:'space-between',gap:10,alignItems:'center'}}><span>{key==='title'?(en?'Title':'Rubrik'):key==='description'?(en?'Description':'Beskrivning'):key==='price'?(en?'Price text':'Pristext'):(en?'Category':'Kategori')}</span><select value={confidence[key]} onChange={e=>setConfidence(current=>({...current,[key]:e.target.value as Confidence}))} style={qualityStyle} aria-label={`${key} quality`}><option value="verified">{confidenceLabel('verified')}</option><option value="user_provided">{confidenceLabel('user_provided')}</option><option value="suggested">{confidenceLabel('suggested')}</option><option value="missing">{confidenceLabel('missing')}</option></select></span>
        {key==='description'?<textarea value={values.description} onChange={e=>setField('description',e.target.value)} rows={5} style={{...inputStyle,padding:11,resize:'vertical'}}/>:<input value={values[key]} onChange={e=>setField(key,e.target.value)} style={inputStyle}/>} 
      </label>)}
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(210px,1fr))',gap:12}}><label style={{display:'grid',gap:6,fontWeight:700}}>{en?'Original URL':'Ursprunglig länk'}<input type="url" value={values.sourceUrl} onChange={e=>setField('sourceUrl',e.target.value)} style={inputStyle}/></label><label style={{display:'grid',gap:6,fontWeight:700}}>{en?'Reference':'Referens'}<input value={values.reference} onChange={e=>setField('reference',e.target.value)} style={inputStyle}/></label></div>
      <button type="submit" disabled={busy} className="modeSwitchButton" style={{border:0,cursor:'pointer',justifySelf:'start'}}>{busy?(en?'Saving…':'Sparar…'):(en?'Save review':'Spara granskning')}</button>
    </form>

    <section style={{display:'grid',gap:10,padding:'14px',border:'1px solid var(--line)',borderRadius:14}}>
      <div><strong>{en?'Images & documents':'Bilder & dokument'}</strong><p style={{margin:'4px 0 0',fontSize:13,color:'var(--muted)'}}>{en?'Files remain private in import staging. They are not published.':'Filerna ligger privat i importens staging och publiceras inte.'}</p></div>
      {assets.length?<div style={{display:'flex',gap:10,flexWrap:'wrap'}}>{assets.map(asset=>asset.asset_kind==='image'&&asset.preview_url?<a key={asset.id} href={asset.preview_url} target="_blank" rel="noreferrer" style={{display:'block'}}><img src={asset.preview_url} alt={asset.source_filename||''} style={{width:86,height:86,objectFit:'cover',borderRadius:12,border:'1px solid var(--line)'}}/></a>:<a key={asset.id} href={asset.preview_url||'#'} target={asset.preview_url?'_blank':undefined} rel="noreferrer" style={{padding:'10px 12px',border:'1px solid var(--line)',borderRadius:12,color:'inherit',textDecoration:'none',fontSize:13}}>{asset.source_filename|| (en?'Document':'Dokument')}</a>)}</div>:<span style={{fontSize:13,color:'var(--muted)'}}>{en?'No files attached yet.':'Inga filer bifogade ännu.'}</span>}
      <form onSubmit={uploadAsset} style={{display:'grid',gap:9}}><input type="file" accept="image/jpeg,image/png,image/webp,image/heic,image/heif,application/pdf" onChange={e=>setFile(e.target.files?.[0]||null)}/><label style={{display:'flex',gap:8,alignItems:'flex-start',fontSize:13}}><input type="checkbox" checked={rightsConfirmed} onChange={e=>setRightsConfirmed(e.target.checked)} style={{marginTop:2}}/><span>{en?'I confirm that I have the right to use this file in my Hyrbart listing.':'Jag bekräftar att jag har rätt att använda filen i min Hyrbart-annons.'}</span></label><button type="submit" disabled={assetBusy||!file||!rightsConfirmed} className="modeSwitchButton" style={{border:0,cursor:'pointer',justifySelf:'start'}}>{assetBusy?(en?'Uploading…':'Laddar upp…'):(en?'Attach file':'Bifoga fil')}</button></form>
    </section>
    {message?<p role="status" style={{margin:0,fontWeight:700}}>{message}</p>:null}
  </article>;
}
