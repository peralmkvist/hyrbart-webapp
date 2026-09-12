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
 const en=locale==='en';const [items,setItems]=useState<Item[]>([]),[saving,setSaving]=useState<number|null>(null),[loaded,setLoaded]=useState(false);
 useEffect(()=>{fetch('/api/automated-messages',{cache:'no-store'}).then(r=>r.ok?r.json():{messages:[]}).then((data:{messages?:Item[]})=>{setItems(data.messages?.length?data.messages:defaults);setLoaded(true)}).catch(()=>{setItems(defaults);setLoaded(true)})},[]);
 async function save(index:number){setSaving(index);try{const item=items[index];const response=await fetch('/api/automated-messages',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(item)});if(!response.ok)throw new Error();const data=await response.json() as {messages?:Item[]};if(data.messages)setItems(data.messages)}finally{setSaving(null)}}
 function patch(index:number,update:Partial<Item>){setItems(current=>current.map((item,i)=>i===index?{...item,...update}:item))}
 if(!loaded)return <p>{en?'Loading…':'Laddar…'}</p>;
 return <div style={{display:'grid',gap:14}}>{items.map((item,index)=><section key={item.id||item.trigger} style={{border:'1px solid var(--line)',borderRadius:18,background:'#fff',padding:16}}><div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',gap:14}}><div><strong style={{display:'block',fontSize:'1rem'}}>{item.name}</strong><span style={{display:'block',marginTop:3,color:'var(--muted)',fontSize:'.78rem'}}>{(en?triggerEn:triggerSv)[item.trigger]}</span></div><label style={{display:'flex',alignItems:'center',gap:8,fontWeight:700,fontSize:'.8rem'}}><input type="checkbox" checked={item.enabled} onChange={e=>patch(index,{enabled:e.target.checked})}/>{en?'Active':'Aktiv'}</label></div><textarea value={en?(item.message.en||''):(item.message.sv||'')} onChange={e=>patch(index,{message:{...item.message,[en?'en':'sv']:e.target.value}})} rows={4} style={{width:'100%',marginTop:14,padding:12,border:'1px solid var(--line)',borderRadius:14,font:'inherit',resize:'vertical'}}/><button type="button" onClick={()=>void save(index)} disabled={saving===index} style={{width:'100%',minHeight:46,marginTop:10,border:0,borderRadius:14,background:'var(--accent)',fontWeight:800}}>{saving===index?(en?'Saving…':'Sparar…'):(en?'Save':'Spara')}</button></section>)}</div>
}
