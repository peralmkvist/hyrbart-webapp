'use client';

import { useMemo, useState } from 'react';

type Listing = { id:string; brand?:string; name?:string; typeSv?:string; listingStatus?:'active'|'paused'|'draft' };

export default function AvailabilityBlocker({ listings, locale }:{ listings:Listing[]; locale:string }){
  const en = locale === 'en';
  const rentable = useMemo(() => listings.filter(item => item.listingStatus !== 'draft'), [listings]);
  const [open,setOpen]=useState(false);
  const [from,setFrom]=useState('');
  const [to,setTo]=useState('');
  const [all,setAll]=useState(true);
  const [selected,setSelected]=useState<string[]>([]);
  const [reason,setReason]=useState<'blocked'|'service'>('blocked');
  const [note,setNote]=useState('');
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  const [success,setSuccess]=useState('');

  const effectiveIds = all ? rentable.map(item=>item.id) : selected;
  const canSave = Boolean(from && to && from <= to && effectiveIds.length);

  function toggle(id:string){ setSelected(value => value.includes(id) ? value.filter(item=>item!==id) : [...value,id]); }
  function close(){ if(!busy){setOpen(false);setError('');setSuccess('');} }

  async function save(){
    if(!canSave) return;
    setBusy(true);setError('');setSuccess('');
    try{
      const response=await fetch('/api/availability',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({productIds:effectiveIds,from,to,status:reason,note})});
      const data=await response.json() as {error?:string;count?:number};
      if(!response.ok) throw new Error(data.error || (en?'Could not block dates.':'Kunde inte blockera datumen.'));
      setSuccess(en?`${data.count||effectiveIds.length} listings blocked.`:`${data.count||effectiveIds.length} annonser blockerade.`);
      window.dispatchEvent(new Event('hyrbart:availability-changed'));
      setTimeout(()=>{setOpen(false);setSuccess('');setFrom('');setTo('');setSelected([]);setAll(true);setNote('');setReason('blocked');},650);
    }catch(err){setError(err instanceof Error?err.message:(en?'Something went wrong.':'Något gick fel.'));}
    finally{setBusy(false)}
  }

  if(!rentable.length) return null;

  return <>
    <button type="button" className="hostAvailabilityButton" onClick={()=>setOpen(true)}>
      <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3.5" y="5.5" width="17" height="15" rx="2"/><path d="M7 3.5v4M17 3.5v4M3.5 9.5h17"/><path d="m9 14 2 2 4-4"/></svg>
      <span>{en?'Availability':'Tillgänglighet'}</span>
    </button>

    {open?<div className="hostAvailabilityBackdrop" onClick={close}>
      <section className="hostAvailabilitySheet" role="dialog" aria-modal="true" aria-label={en?'Block availability':'Blockera tillgänglighet'} onClick={event=>event.stopPropagation()}>
        <div className="hostAvailabilityHandle" aria-hidden="true"/>
        <header><div><span>{en?'Availability':'TILLGÄNGLIGHET'}</span><h2>{en?'Block dates':'Blockera datum'}</h2><p>{en?'Listings are available by default. Add exceptions when you cannot rent them out.':'Annonser är tillgängliga som standard. Lägg till undantag när du inte kan hyra ut.'}</p></div><button type="button" onClick={close} aria-label={en?'Close':'Stäng'}>×</button></header>

        <div className="hostAvailabilityDates">
          <label><span>{en?'From':'Från'}</span><input type="date" value={from} onChange={e=>{setFrom(e.target.value);if(!to||to<e.target.value)setTo(e.target.value)}}/></label>
          <label><span>{en?'To':'Till'}</span><input type="date" min={from||undefined} value={to} onChange={e=>setTo(e.target.value)}/></label>
        </div>

        <div className="hostAvailabilityScope">
          <button type="button" className={all?'active':''} onClick={()=>setAll(true)}><i>{all?'✓':''}</i><span><strong>{en?'All listings':'Alla annonser'}</strong><small>{rentable.length} {en?'listings':'annonser'}</small></span></button>
          <button type="button" className={!all?'active':''} onClick={()=>setAll(false)}><i>{!all?'✓':''}</i><span><strong>{en?'Selected listings':'Utvalda annonser'}</strong><small>{selected.length||0} {en?'selected':'valda'}</small></span></button>
        </div>

        {!all?<div className="hostAvailabilityListings">
          {rentable.map(item=>{const checked=selected.includes(item.id);return <label key={item.id} className={checked?'selected':''}><input type="checkbox" checked={checked} onChange={()=>toggle(item.id)}/><i>{checked?'✓':''}</i><span><strong>{[item.brand,item.name].filter(Boolean).join(' ')||item.typeSv||'Annons'}</strong>{item.typeSv?<small>{item.typeSv}</small>:null}</span></label>})}
        </div>:null}

        <label className="hostAvailabilityField"><span>{en?'Reason':'Orsak'}</span><select value={reason} onChange={e=>setReason(e.target.value as 'blocked'|'service')}><option value="blocked">{en?'Unavailable':'Inte tillgänglig'}</option><option value="service">{en?'Service / maintenance':'Service / underhåll'}</option></select></label>
        <label className="hostAvailabilityField"><span>{en?'Note (optional)':'Notering (valfritt)'}</span><input value={note} onChange={e=>setNote(e.target.value)} placeholder={en?'E.g. away':'T.ex. bortrest'}/></label>

        {error?<p className="hostAvailabilityError">{error}</p>:null}
        {success?<p className="hostAvailabilitySuccess">{success}</p>:null}
        <footer><button type="button" className="secondary" onClick={close}>{en?'Cancel':'Avbryt'}</button><button type="button" disabled={!canSave||busy} onClick={save}>{busy?(en?'Saving…':'Sparar…'):(en?'Block dates':'Blockera datum')}</button></footer>
      </section>
    </div>:null}
  </>;
}
