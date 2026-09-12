'use client';

import { useEffect, useState } from 'react';

type Item={id?:string;name:string;trigger:string;enabled:boolean;message:{sv?:string;en?:string}};
const defaults:Item[]=[
 {name:'Bokning godkänd',trigger:'booking-approved',enabled:true,message:{sv:'Hej! Din bokning är godkänd. Jag återkommer med praktisk information inför hämtningen.',en:'Hi! Your booking is confirmed. I will send practical pickup information before your rental.'}},
 {name:'Inför hämtning',trigger:'pickup-24h',enabled:true,message:{sv:'Hej! En påminnelse inför morgondagens hämtning. Hör gärna av dig om du undrar något.',en:'Hi! A quick reminder before tomorrow’s pickup. Feel free to message me if you have any questions.'}},
 {name:'Återlämning',trigger:'return-morning',enabled:true,message:{sv:'Hej! Hoppas hyran har fungerat bra. Här kommer en påminnelse om återlämningen idag.',en:'Hi! I hope the rental has gone well. Here is a reminder about today’s return.'}},
];
const triggerSv:Record<string,string>={'booking-approved':'När bokningen godkänns','pickup-24h':'24 timmar före hämtning','return-morning':'På morgonen för återlämning'};
const triggerEn:Record<string,string>={'booking-approved':'When the booking is approved','pickup-24h':'24 hours before pickup','return-morning':'On the morning of return'};

export default function AutomatedMessages({locale}:{locale:string}){
 const en=locale==='en';
 const [items,setItems]=useState<Item[]>([]),[saving,setSaving]=useState<number|null>(null),[loaded,setLoaded]=useState(false);

 useEffect(()=>{fetch('/api/automated-messages',{cache:'no-store'}).then(r=>r.ok?r.json():{messages:[]}).then((data:{messages?:Item[]})=>{setItems(data.messages?.length?data.messages:defaults);setLoaded(true)}).catch(()=>{setItems(defaults);setLoaded(true)})},[]);
 async function save(index:number){setSaving(index);try{const item=items[index];const response=await fetch('/api/automated-messages',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(item)});if(!response.ok)throw new Error();const data=await response.json() as {messages?:Item[]};if(data.messages)setItems(data.messages)}finally{setSaving(null)}}
 function patch(index:number,update:Partial<Item>){setItems(current=>current.map((item,i)=>i===index?{...item,...update}:item))}

 if(!loaded)return <p style={{color:'var(--muted)'}}>{en?'Loading…':'Laddar…'}</p>;

 return <div style={{display:'grid',gap:18}}>{items.map((item,index)=><section key={item.id||item.trigger} style={{border:'1px solid var(--line)',borderRadius:22,background:'#fff',padding:18,boxShadow:'0 5px 18px rgba(17,17,17,.04)'}}>
   <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',gap:16}}>
     <div style={{minWidth:0}}>
       <strong style={{display:'block',fontSize:'1.05rem',lineHeight:1.2,letterSpacing:'-.02em'}}>{item.name}</strong>
       <span style={{display:'block',marginTop:5,color:'var(--muted)',fontSize:'.82rem',lineHeight:1.35}}>{(en?triggerEn:triggerSv)[item.trigger]}</span>
     </div>
     <label style={{display:'flex',alignItems:'center',gap:8,flex:'0 0 auto',fontWeight:750,fontSize:'.8rem',color:'var(--ink)'}}>
       <input type="checkbox" checked={item.enabled} onChange={e=>patch(index,{enabled:e.target.checked})} style={{width:21,height:21,accentColor:'var(--accent)',cursor:'pointer'}}/>
       {en?'Active':'Aktiv'}
     </label>
   </div>
   <textarea
     value={en?(item.message.en||''):(item.message.sv||'')}
     onChange={e=>patch(index,{message:{...item.message,[en?'en':'sv']:e.target.value}})}
     rows={4}
     style={{width:'100%',boxSizing:'border-box',marginTop:18,padding:'14px 15px',border:'1px solid var(--line)',borderRadius:16,background:'#fff',color:'var(--ink)',font:'inherit',fontSize:'1rem',lineHeight:1.45,resize:'vertical',outline:'none'}}
   />
   <button type="button" onClick={()=>void save(index)} disabled={saving===index} style={{width:'100%',minHeight:50,marginTop:12,border:0,borderRadius:16,background:'var(--accent)',color:'var(--ink)',fontSize:'.95rem',fontWeight:850,letterSpacing:'-.01em',opacity:saving===index?.68:1}}>{saving===index?(en?'Saving…':'Sparar…'):(en?'Save':'Spara')}</button>
 </section>)}</div>
}
