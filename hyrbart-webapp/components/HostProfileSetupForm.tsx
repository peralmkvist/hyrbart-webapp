'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

type Suggestion={label:string;lat:number;lng:number;city:string;area?:string;address?:string};
type Pickup={name:string;label:string;city:string;area?:string;address?:string;lat:number;lng:number};

export default function HostProfileSetupForm({locale}:{locale:string}){
  const en=locale==='en'; const router=useRouter();
  const [displayName,setDisplayName]=useState(''); const [locations,setLocations]=useState<Pickup[]>([]);
  const [query,setQuery]=useState(''); const [suggestions,setSuggestions]=useState<Suggestion[]>([]); const [loading,setLoading]=useState(true); const [saving,setSaving]=useState(false); const [error,setError]=useState('');

  useEffect(()=>{fetch('/api/host-profile',{cache:'no-store'}).then(async r=>{const d=await r.json();if(!r.ok)throw new Error(d.error);setDisplayName(d.displayName||'');setLocations(d.locations||[])}).catch(e=>setError(e instanceof Error?e.message:'Kunde inte läsa profilen.')).finally(()=>setLoading(false))},[]);
  useEffect(()=>{const text=query.trim();if(text.length<2){setSuggestions([]);return}const timer=window.setTimeout(()=>{fetch(`/api/location-search?q=${encodeURIComponent(text)}`,{cache:'no-store'}).then(r=>r.json()).then((d:{results?:Suggestion[]})=>setSuggestions(d.results||[])).catch(()=>setSuggestions([]))},250);return()=>window.clearTimeout(timer)},[query]);

  function addLocation(item:Suggestion){
    const name=item.area||item.city||item.address||item.label.split(',')[0]||'Utlämningsplats';
    setLocations(current=>[...current,{name,label:item.label,city:item.city||name,area:item.area,address:item.address,lat:item.lat,lng:item.lng}]);
    setQuery('');setSuggestions([]);
  }
  function removeLocation(index:number){setLocations(current=>current.filter((_,i)=>i!==index))}
  async function save(){setSaving(true);setError('');try{const r=await fetch('/api/host-profile',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({displayName,locations})});const d=await r.json();if(!r.ok)throw new Error(d.error||'Kunde inte spara.');router.push(`/${locale}/vard/onboarding`);router.refresh()}catch(e){setError(e instanceof Error?e.message:'Kunde inte spara.')}finally{setSaving(false)}}

  if(loading)return <p className="hostProfileSetupLoading">{en?'Loading…':'Laddar…'}</p>;
  return <div className="hostProfileSetupForm">
    <label><span>{en?'Name':'Namn'}</span><input value={displayName} onChange={e=>setDisplayName(e.target.value)} placeholder={en?'Your name':'Ditt namn'}/></label>
    <div className="hostProfileLocations">
      <div className="hostProfileSectionTitle"><strong>{en?'Pickup locations':'Utlämningsplatser'}</strong><span>{en?'Add one or more places where renters can collect your items.':'Lägg till en eller flera platser där hyrare kan hämta dina saker.'}</span></div>
      {locations.map((location,index)=><div className="hostProfileLocationCard" key={`${location.lat}-${location.lng}-${index}`}><div><strong>{location.name}</strong><span>{location.label}</span></div><button type="button" onClick={()=>removeLocation(index)} aria-label={en?'Remove pickup location':'Ta bort utlämningsplats'}>×</button></div>)}
      <div className="hostProfileLocationSearch"><input value={query} onChange={e=>setQuery(e.target.value)} placeholder={en?'Search address or place':'Sök adress eller plats'}/>{suggestions.length?<div className="hostProfileSuggestions">{suggestions.map(item=><button type="button" key={`${item.lat}-${item.lng}`} onClick={()=>addLocation(item)}><strong>{item.area||item.city||item.address||item.label.split(',')[0]}</strong><span>{item.label}</span></button>)}</div>:null}</div>
    </div>
    {error?<p className="hostProfileSetupError">{error}</p>:null}
    <button type="button" className="hostOnboardingPrimary hostProfileSave" onClick={()=>void save()} disabled={saving||!displayName.trim()||!locations.length}>{saving?(en?'Saving…':'Sparar…'):(en?'Save host profile':'Spara uthyrarprofil')}</button>
  </div>;
}
