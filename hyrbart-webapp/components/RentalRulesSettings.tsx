'use client';
import {useEffect,useMemo,useState} from 'react';

type Listing={id:string;brand?:string;name?:string;typeSv?:string;listingStatus?:string};
type RuleRow={product_id:string;min_rental_minutes:number;max_rental_minutes:number|null;buffer_minutes:number};

type Unit='hours'|'days';
const toMinutes=(value:string,unit:Unit)=>Math.round(Number(value||0)*(unit==='days'?1440:60));
const fromMinutes=(minutes:number|null,unit:Unit)=>minutes===null?'':String(minutes/(unit==='days'?1440:60));

export default function RentalRulesSettings({locale}:{locale:string}){
  const en=locale==='en';
  const [listings,setListings]=useState<Listing[]>([]);
  const [rules,setRules]=useState<Record<string,RuleRow>>({});
  const [productId,setProductId]=useState('');
  const [minValue,setMinValue]=useState('0'); const [minUnit,setMinUnit]=useState<Unit>('hours');
  const [maxValue,setMaxValue]=useState(''); const [maxUnit,setMaxUnit]=useState<Unit>('days');
  const [bufferValue,setBufferValue]=useState('0'); const [bufferUnit,setBufferUnit]=useState<Unit>('hours');
  const [busy,setBusy]=useState(false); const [message,setMessage]=useState('');

  useEffect(()=>{void Promise.all([
    fetch('/api/host-listings',{cache:'no-store'}).then(r=>r.json()),
    fetch('/api/rental-rules',{cache:'no-store'}).then(r=>r.json()),
  ]).then(([listingData,ruleData])=>{
    const nextListings=(listingData.listings||[]) as Listing[];
    setListings(nextListings);
    const nextRules:Record<string,RuleRow>={}; for(const row of (ruleData.rules||[]) as RuleRow[])nextRules[row.product_id]=row;
    setRules(nextRules); if(nextListings[0])setProductId(nextListings[0].id);
  });},[]);

  useEffect(()=>{
    if(!productId)return; const rule=rules[productId];
    if(!rule){setMinValue('0');setMinUnit('hours');setMaxValue('');setMaxUnit('days');setBufferValue('0');setBufferUnit('hours');return;}
    const choose=(minutes:number|null,preferDays:boolean):[string,Unit]=>{
      if(minutes===null)return['',preferDays?'days':'hours'];
      if(minutes>0&&minutes%1440===0)return[fromMinutes(minutes,'days'),'days'];
      return[fromMinutes(minutes,'hours'),'hours'];
    };
    const [mi,miu]=choose(rule.min_rental_minutes,false),[ma,mau]=choose(rule.max_rental_minutes,true),[bu,buu]=choose(rule.buffer_minutes,false);
    setMinValue(mi);setMinUnit(miu);setMaxValue(ma);setMaxUnit(mau);setBufferValue(bu);setBufferUnit(buu);
  },[productId,rules]);

  const selected=useMemo(()=>listings.find(item=>item.id===productId),[listings,productId]);
  async function save(){
    setBusy(true);setMessage('');
    const min=toMinutes(minValue,minUnit),max=maxValue.trim()===''?null:toMinutes(maxValue,maxUnit),buffer=toMinutes(bufferValue,bufferUnit);
    if(max!==null&&max<min){setMessage(en?'Maximum rental time must be at least the minimum.':'Maximal uthyrningstid måste vara minst lika lång som minimitiden.');setBusy(false);return;}
    const res=await fetch('/api/rental-rules',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({productId,minRentalMinutes:min,maxRentalMinutes:max,bufferMinutes:buffer})});
    const body=await res.json().catch(()=>({}));
    if(!res.ok){setMessage(body.error||(en?'Could not save.':'Kunde inte spara.'));setBusy(false);return;}
    setRules(prev=>({...prev,[productId]:body.rule}));setMessage(en?'Saved.':'Sparat.');setBusy(false);
  }
  const field=(label:string,value:string,setValue:(v:string)=>void,unit:Unit,setUnit:(u:Unit)=>void,optional=false)=>
    <label style={{display:'grid',gap:7}}><strong>{label}</strong><div style={{display:'grid',gridTemplateColumns:'1fr 130px',gap:8}}><input type="number" min="0" step="1" value={value} placeholder={optional?(en?'No limit':'Ingen gräns'):undefined} onChange={e=>setValue(e.target.value)} style={{padding:'12px 13px',border:'1px solid var(--line)',borderRadius:12,fontSize:16}}/><select value={unit} onChange={e=>setUnit(e.target.value as Unit)} style={{padding:'12px 13px',border:'1px solid var(--line)',borderRadius:12,fontSize:16}}><option value="hours">{en?'hours':'timmar'}</option><option value="days">{en?'days':'dagar'}</option></select></div></label>;

  return <section style={{display:'grid',gap:18}}>
    <div style={{display:'grid',gap:7}}><strong>{en?'Listing':'Annons'}</strong><select value={productId} onChange={e=>{setMessage('');setProductId(e.target.value)}} style={{padding:'12px 13px',border:'1px solid var(--line)',borderRadius:12,fontSize:16}}>{listings.map(item=><option value={item.id} key={item.id}>{[item.brand,item.name||item.typeSv].filter(Boolean).join(' ')}</option>)}</select></div>
    {!listings.length?<p>{en?'You have no listings to configure yet.':'Du har inga annonser att konfigurera ännu.'}</p>:<>
      <div style={{padding:16,border:'1px solid var(--line)',borderRadius:16,display:'grid',gap:16}}>
        <h2 style={{margin:0,fontSize:18}}>{[selected?.brand,selected?.name||selected?.typeSv].filter(Boolean).join(' ')}</h2>
        {field(en?'Minimum rental time':'Minsta uthyrningstid',minValue,setMinValue,minUnit,setMinUnit)}
        <small>{en?'0 means no minimum.':'0 betyder ingen minimitid.'}</small>
        {field(en?'Maximum rental time':'Längsta uthyrningstid',maxValue,setMaxValue,maxUnit,setMaxUnit,true)}
        <small>{en?'Leave empty for no maximum.':'Lämna tomt för ingen maxgräns.'}</small>
        {field(en?'Buffer between rentals':'Buffert mellan uthyrningar',bufferValue,setBufferValue,bufferUnit,setBufferUnit)}
        <small>{en?'The item cannot be booked inside this time before or after another booking.':'Annonsen kan inte bokas inom denna tid före eller efter en annan bokning.'}</small>
      </div>
      {message?<p role="status" style={{margin:0}}>{message}</p>:null}
      <button type="button" onClick={save} disabled={busy||!productId} style={{padding:'13px 18px',border:0,borderRadius:999,fontWeight:800,cursor:'pointer'}}>{busy?(en?'Saving…':'Sparar…'):(en?'Save rental rules':'Spara uthyrningsregler')}</button>
    </>}
  </section>;
}
