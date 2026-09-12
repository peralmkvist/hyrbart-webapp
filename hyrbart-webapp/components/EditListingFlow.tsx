'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

type Listing={id:string;brand?:string;name?:string;typeSv?:string;category?:string;dailyPrice?:number;description?:{sv?:string};listingStatus?:string};
const categories=['Barnartiklar','Belysning','Biltillbehör','Borra & Skruva','Handverktyg','Hem & hushåll','Håltagning','Kontor','Luftverktyg','Mäta','Städa & Tvätta','Såga & Slipa','Trädgård','Värme'];

export default function EditListingFlow({locale,id}:{locale:string;id:string}){
  const en=locale==='en'; const router=useRouter(); const [item,setItem]=useState<Listing|null>(null); const [busy,setBusy]=useState(false); const [error,setError]=useState('');
  useEffect(()=>{(async()=>{try{const r=await fetch('/api/host-listings',{cache:'no-store'});const d=await r.json();if(!r.ok)throw new Error(d.error);const found=(d.listings||[]).find((x:Listing)=>x.id===id);if(!found)throw new Error(en?'Listing not found.':'Annonsen hittades inte.');setItem(found);}catch(e){setError(e instanceof Error?e.message:'Något gick fel.')}})()},[id,en]);
  function patch(key:keyof Listing,value:any){setItem(v=>v?{...v,[key]:value}:v)}
  async function save(){if(!item)return;setBusy(true);setError('');try{const values={typeSv:item.typeSv,category:item.category,brand:item.brand,name:item.name,dailyPrice:Number(item.dailyPrice||0),description:{_type:'localizedText',sv:item.description?.sv||''}};const r=await fetch('/api/host-listings',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id,action:'update',values})});const d=await r.json();if(!r.ok)throw new Error(d.error||'Kunde inte spara.');router.push(`/${locale}/vard/annonser`);router.refresh();}catch(e){setError(e instanceof Error?e.message:'Något gick fel.')}finally{setBusy(false)}}
  if(!item)return <section className="editListingFlow"><p>{error||(en?'Loading…':'Laddar…')}</p></section>;
  return <section className="editListingFlow"><header><button onClick={()=>router.back()}>‹</button><div><span>{en?'Edit listing':'Redigera annons'}</span><strong>{[item.brand,item.name].filter(Boolean).join(' ')}</strong></div></header><div className="editListingBody">
    <label className="newListingField"><span>{en?'Product type':'Produkttyp'}</span><input value={item.typeSv||''} onChange={e=>patch('typeSv',e.target.value)}/></label>
    <label className="newListingField"><span>{en?'Category':'Kategori'}</span><select value={item.category||''} onChange={e=>patch('category',e.target.value)}>{categories.map(c=><option key={c}>{c}</option>)}</select></label>
    <div className="newListingTwoCols"><label className="newListingField"><span>{en?'Brand':'Varumärke'}</span><input value={item.brand||''} onChange={e=>patch('brand',e.target.value)}/></label><label className="newListingField"><span>{en?'Name / model':'Namn / modell'}</span><input value={item.name||''} onChange={e=>patch('name',e.target.value)}/></label></div>
    <label className="newListingField"><span>{en?'Description':'Produktbeskrivning'}</span><textarea rows={7} value={item.description?.sv||''} onChange={e=>patch('description',{sv:e.target.value})}/></label>
    <label className="newListingMoney"><span>{en?'Price per day':'Pris per dygn'}</span><div><input inputMode="numeric" value={item.dailyPrice||''} onChange={e=>patch('dailyPrice',Number(e.target.value.replace(/\D/g,'')))}/><b>kr</b></div></label>
    {error?<p className="newListingError">{error}</p>:null}
  </div><footer><button disabled={busy||!item.name||!item.typeSv||!item.dailyPrice} onClick={save}>{busy?(en?'Saving…':'Sparar…'):(en?'Save changes':'Spara ändringar')}</button></footer></section>;
}
