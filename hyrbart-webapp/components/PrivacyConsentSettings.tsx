'use client';

import { useEffect, useState } from 'react';

type Key='product_updates'|'marketing_push'|'product_research'|'marketing_measurement'|'personalization';
type Prefs=Record<Key,boolean>;
const DEFAULTS:Prefs={product_updates:false,marketing_push:false,product_research:false,marketing_measurement:false,personalization:false};

export default function PrivacyConsentSettings({locale}:{locale:string}){
 const en=locale==='en';
 const [prefs,setPrefs]=useState<Prefs>(DEFAULTS);
 const [loading,setLoading]=useState(true);
 const [saving,setSaving]=useState<Key|null>(null);
 const [error,setError]=useState('');
 useEffect(()=>{let active=true;fetch('/api/privacy/preferences',{cache:'no-store'}).then(async r=>{if(!r.ok)throw new Error();return r.json()}).then(data=>{if(active)setPrefs({...DEFAULTS,...data.preferences})}).catch(()=>{if(active)setError(en?'Could not load privacy settings.':'Kunde inte läsa sekretessinställningarna.');}).finally(()=>{if(active)setLoading(false)});return()=>{active=false}},[en]);
 const items:{key:Key;title:string;body:string}[]=[
  {key:'product_updates',title:en?'Hyrbart updates':'Få uppdateringar om Hyrbart',body:en?'Product news, service updates and relevant information from Hyrbart.':'Produktnyheter, tjänsteuppdateringar och relevant information från Hyrbart.'},
  {key:'marketing_push',title:en?'Personal marketing via push':'Personlig marknadsföring via pushnotiser',body:en?'Optional promotional push notifications tailored to your use of Hyrbart.':'Valfria marknadsföringsnotiser som kan anpassas efter hur du använder Hyrbart.'},
  {key:'product_research',title:en?'Help us improve the product':'Hjälp oss med produktutvecklingen',body:en?'Allow optional use of feedback and usage patterns for product research and improvement.':'Tillåt valfri användning av feedback och användningsmönster för produktanalys och förbättring.'},
  {key:'marketing_measurement',title:en?'Help us improve marketing':'Hjälp oss att marknadsföra tjänsterna bättre',body:en?'Allow optional measurement used to understand which marketing performs best.':'Tillåt valfri mätning för att förstå vilken marknadsföring som fungerar bäst.'},
  {key:'personalization',title:en?'Personalize my experience':'Personanpassa min upplevelse',body:en?'Allow optional personalization of recommendations and presentation based on your activity.':'Tillåt valfri personalisering av rekommendationer och presentation utifrån din aktivitet.'},
 ];
 async function toggle(key:Key){
  if(saving||loading)return;
  const enabled=!prefs[key];
  setSaving(key);setError('');
  try{
   const r=await fetch('/api/privacy/preferences',{method:'PATCH',headers:{'content-type':'application/json'},body:JSON.stringify({key,enabled})});
   if(!r.ok)throw new Error();
   setPrefs(v=>({...v,[key]:enabled}));
  }catch{setError(en?'Could not save the change. Try again.':'Kunde inte spara ändringen. Försök igen.')}finally{setSaving(null)}
 }
 return <div>
  {error?<p role="alert" style={{margin:'0 0 12px',color:'var(--color-danger, #b42318)'}}>{error}</p>:null}
  <div style={{display:'grid',gap:10}}>
   {items.map(item=><div key={item.key} style={{display:'grid',gridTemplateColumns:'1fr auto',gap:16,alignItems:'center',padding:'14px 0',borderBottom:'1px solid var(--border-subtle, #e8e8e8)'}}>
    <div><strong style={{display:'block',marginBottom:4}}>{item.title}</strong><span style={{display:'block',fontSize:14,lineHeight:1.45,opacity:.72}}>{item.body}</span></div>
    <button type="button" role="switch" aria-checked={prefs[item.key]} aria-label={item.title} disabled={loading||saving===item.key} onClick={()=>void toggle(item.key)} style={{width:46,height:28,borderRadius:999,border:'1px solid rgba(0,0,0,.14)',padding:3,background:prefs[item.key]?'var(--accent, #f2c94c)':'#e6e6e6',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:prefs[item.key]?'flex-end':'flex-start'}}><span aria-hidden="true" style={{width:20,height:20,borderRadius:'50%',background:'#fff',boxShadow:'0 1px 3px rgba(0,0,0,.22)'}}/></button>
   </div>)}
  </div>
  <p style={{margin:'14px 0 0',fontSize:13,opacity:.68}}>{en?'Optional choices are off by default. You can withdraw consent here at any time; each change is timestamped and versioned.':'Valfria samtycken är av som standard. Du kan återkalla dem här när som helst; varje ändring tidsstämplas och versionshanteras.'}</p>
 </div>
}
