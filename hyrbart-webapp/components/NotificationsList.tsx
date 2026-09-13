'use client';
import { useEffect, useState } from 'react';

type Item = { id:string; title:string; body:string; url:string|null; read_at:string|null; created_at:string; notification_type:string; push_status:string; email_status:string };

export default function NotificationsList({ locale }: { locale:string }) {
  const [items,setItems]=useState<Item[]>([]),[loading,setLoading]=useState(true),[busy,setBusy]=useState(false);
  async function load(){setLoading(true);const r=await fetch('/api/notifications',{cache:'no-store'});const j=await r.json().catch(()=>({}));setItems(j.notifications||[]);setLoading(false)}
  useEffect(()=>{load()},[]);
  async function mark(id:string){await fetch('/api/notifications',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({id})});setItems(v=>v.map(x=>x.id===id?{...x,read_at:new Date().toISOString()}:x))}
  async function markAll(){setBusy(true);await fetch('/api/notifications',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({all:true})});setItems(v=>v.map(x=>({...x,read_at:x.read_at||new Date().toISOString()})));setBusy(false)}
  if(loading)return <div style={{padding:24}}>Laddar…</div>;
  const unread=items.filter(x=>!x.read_at).length;
  return <div style={{padding:'0 20px 100px'}}>
    <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:12,margin:'8px 0 18px'}}><p style={{margin:0,color:'var(--muted)'}}>{unread?`${unread} olästa`:'Du är uppdaterad.'}</p>{unread?<button onClick={markAll} disabled={busy} style={{border:0,background:'none',fontWeight:700,cursor:'pointer'}}>{busy?'Markerar…':'Markera alla som lästa'}</button>:null}</div>
    <div style={{display:'grid',gap:10}}>{items.map(item=><a key={item.id} href={item.url||`/${locale}/profil/notiser`} onClick={()=>{if(!item.read_at)void mark(item.id)}} style={{display:'block',padding:'16px 18px',border:'1px solid var(--line)',borderRadius:18,background:item.read_at?'#fff':'rgba(198,240,0,.12)',color:'inherit',textDecoration:'none'}}><div style={{display:'flex',justifyContent:'space-between',gap:12}}><strong>{item.title}</strong>{!item.read_at?<span aria-label="Oläst" style={{width:9,height:9,borderRadius:'50%',background:'var(--accent,#c6f000)',flex:'0 0 auto',marginTop:5}}/>:null}</div><p style={{margin:'6px 0 8px',lineHeight:1.45}}>{item.body}</p><small style={{color:'var(--muted)'}}>{new Date(item.created_at).toLocaleString(locale==='en'?'en-GB':'sv-SE')}</small></a>)}{!items.length?<div style={{padding:'28px 18px',textAlign:'center',border:'1px solid var(--line)',borderRadius:18,color:'var(--muted)'}}>Inga notiser ännu.</div>:null}</div>
  </div>;
}
