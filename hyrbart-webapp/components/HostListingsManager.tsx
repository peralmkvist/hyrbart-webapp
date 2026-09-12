'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import AvailabilityBlocker from './AvailabilityBlocker';

type Listing={id:string;slug:string;brand?:string;name?:string;typeSv?:string;category?:string;dailyPrice?:number;listingStatus?:'active'|'paused'|'draft';image?:string};
type Filter='all'|'active'|'paused'|'draft';

export default function HostListingsManager({locale}:{locale:string}){
  const en=locale==='en';
  const [listings,setListings]=useState<Listing[]>([]);
  const [filter,setFilter]=useState<Filter>('all');
  const [loading,setLoading]=useState(true);
  const [busy,setBusy]=useState<string|null>(null);
  const [error,setError]=useState('');
  const [payoutReady,setPayoutReady]=useState(false);
  const [hostProfileReady,setHostProfileReady]=useState(true);

  async function load(){
    setLoading(true);setError('');
    try{
      const r=await fetch('/api/host-listings',{cache:'no-store'});
      const d=await r.json();
      if(!r.ok)throw new Error(d.error||'Kunde inte läsa annonser.');
      setListings(d.listings||[]);
      setPayoutReady(Boolean(d.payoutReady));
      setHostProfileReady(d.hostProfileReady!==false);
    }catch(e){setError(e instanceof Error?e.message:'Något gick fel.');}
    finally{setLoading(false)}
  }
  useEffect(()=>{void load()},[]);

  const counts=useMemo(()=>({
    all:listings.length,
    active:listings.filter(x=>(x.listingStatus||'active')==='active').length,
    paused:listings.filter(x=>x.listingStatus==='paused').length,
    draft:listings.filter(x=>x.listingStatus==='draft').length,
  }),[listings]);
  const shown=useMemo(()=>filter==='all'?listings:listings.filter(x=>(x.listingStatus||'active')===filter),[listings,filter]);

  async function action(item:Listing,action:'pause'|'activate'|'duplicate'|'delete'){
    if(action==='delete'&&!confirm(en?'Delete this listing permanently?':'Ta bort annonsen permanent?'))return;
    setBusy(item.id);setError('');
    try{
      const r=await fetch('/api/host-listings',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:item.id,action})});
      const d=await r.json();
      if(!r.ok)throw new Error(d.error||'Kunde inte uppdatera annonsen.');
      await load();
    }catch(e){setError(e instanceof Error?e.message:'Något gick fel.');}
    finally{setBusy(null)}
  }

  const labels:{key:Filter;sv:string;en:string}[]=[
    {key:'all',sv:'Alla',en:'All'},
    {key:'active',sv:'Aktiva',en:'Active'},
    {key:'paused',sv:'Pausade',en:'Paused'},
    {key:'draft',sv:'Utkast',en:'Drafts'},
  ];

  const hasListings=listings.length>0;

  return <section className="hostListingsWorkspace">
    <header className="hostListingsHeader2">
      <div>
        <h1>{en?'Your listings':'Dina annonser'}</h1>
        <p>{en?`${counts.active} active · ${counts.draft} drafts`:`${counts.active} aktiva · ${counts.draft} utkast`}</p>
      </div>
      <div className="hostListingsHeaderActions">
        <AvailabilityBlocker listings={listings} locale={locale}/>
        <Link href={`/${locale}/vard/annonser/ny`} className="hostListingsAdd" aria-label={en?'Create listing':'Skapa annons'}>＋</Link>
      </div>
    </header>

    {!loading&&!hostProfileReady?
      <section className="hostListingsWelcome">
        <div className="hostListingsWelcomeIcon" aria-hidden="true">
          <svg viewBox="0 0 24 24"><path d="M4 10.5 12 4l8 6.5V20H4v-9.5Z"/><path d="M9 20v-6h6v6"/></svg>
        </div>
        <span className="hostListingsEyebrow">{en?'Start renting out':'Kom igång som uthyrare'}</span>
        <h2>{en?'Create your first listing':'Skapa din första annons'}</h2>
        <p>{en?'Finish your host profile, then add what you want to rent out. You can save a draft before your payout account is connected.':'Slutför din uthyrarprofil och lägg sedan upp det du vill hyra ut. Du kan spara annonsen som utkast innan utbetalningskontot är kopplat.'}</p>
        <div className="hostListingsWelcomeActions">
          <Link href={`/${locale}/vard/onboarding`} className="hostListingsPrimaryCta">{en?'Finish host setup':'Slutför uthyrarprofil'}</Link>
          <Link href={`/${locale}/vard/annonser/ny`} className="hostListingsSecondaryCta">{en?'Create draft':'Skapa utkast'}</Link>
        </div>
      </section>
    :<>
      {!payoutReady?<Link href={`/${locale}/vard/onboarding`} className="hostListingsPayoutWarning"><strong>{en?'Finish host setup':'Slutför uthyrarstart'}</strong><span>{en?'A payout account is required before a listing can go live.':'Utbetalningskonto krävs innan en annons kan aktiveras.'} ›</span></Link>:null}

      {hasListings?<div className="hostListingsFilters">{labels.map(x=><button key={x.key} className={filter===x.key?'active':''} onClick={()=>setFilter(x.key)}>{en?x.en:x.sv}<b>{counts[x.key]}</b></button>)}</div>:null}

      {error?<p className="hostListingsError">{error}</p>:null}

      {loading?<div className="hostListingsEmpty hostListingsLoading">{en?'Loading…':'Laddar…'}</div>
      :shown.length===0?
        <div className="hostListingsEmptyState">
          <div className="hostListingsEmptyIcon" aria-hidden="true">＋</div>
          <strong>{filter==='all'?(en?'No listings yet':'Inga annonser ännu'):(en?'Nothing in this filter':'Inget i det här filtret')}</strong>
          <p>{filter==='all'?(en?'Create your first listing and start renting out.':'Skapa din första annons och börja hyra ut.'):(en?'Try another filter or create a new listing.':'Byt filter eller skapa en ny annons.')}</p>
          <Link href={`/${locale}/vard/annonser/ny`} className="hostListingsPrimaryCta">{en?'Create listing':'Skapa annons'}</Link>
        </div>
      :<div className="hostListingsCards">{shown.map(item=>{
        const status=item.listingStatus||'active';
        const statusText=status==='active'?(en?'Active':'Aktiv'):status==='paused'?(en?'Paused':'Pausad'):(en?'Draft':'Utkast');
        return <article className="hostListingManageCard" key={item.id}>
          <div className="hostListingManageMain">
            {item.image?<img src={item.image} alt=""/>:<div className="hostListingManagePlaceholder">H</div>}
            <div><span>{item.typeSv||item.category||''}</span><strong>{[item.brand,item.name].filter(Boolean).join(' ')||'Annons'}</strong><small>{item.dailyPrice?`${item.dailyPrice} kr/${en?'day':'dygn'}`:''}</small></div>
            <i className={`status-${status}`}>{statusText}</i>
          </div>
          <div className="hostListingManageActions">
            <Link href={`/${locale}/vard/annonser/${encodeURIComponent(item.id)}/redigera`}>{en?'Edit':'Redigera'}</Link>
            {status==='active'?<button disabled={busy===item.id} onClick={()=>action(item,'pause')}>{en?'Pause':'Pausa'}</button>:<button disabled={busy===item.id} onClick={()=>action(item,'activate')}>{en?'Activate':'Aktivera'}</button>}
            <button disabled={busy===item.id} onClick={()=>action(item,'duplicate')}>{en?'Duplicate':'Duplicera'}</button>
            <button className="danger" disabled={busy===item.id} onClick={()=>action(item,'delete')}>{en?'Delete':'Ta bort'}</button>
          </div>
        </article>})}</div>}
    </>}
  </section>
}
