'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';

type NotificationItem={id:string;title:string;body:string;url:string|null;read_at:string|null;created_at:string};

export default function NotificationBell({locale}:{locale:string}){
  const en=locale==='en';
  const [items,setItems]=useState<NotificationItem[]>([]);
  const [unread,setUnread]=useState(0);
  const [open,setOpen]=useState(false);
  const [available,setAvailable]=useState(false);
  const rootRef=useRef<HTMLDivElement>(null);

  async function load(){
    const response=await fetch('/api/notifications',{cache:'no-store'});
    if(response.status===401){setAvailable(false);return;}
    if(!response.ok)return;
    const json=await response.json() as {notifications?:NotificationItem[];unread?:number};
    setItems((json.notifications||[]).slice(0,8));
    setUnread(Number(json.unread||0));
    setAvailable(true);
  }
  useEffect(()=>{void load();const id=window.setInterval(()=>void load(),60000);return()=>window.clearInterval(id)},[]);
  useEffect(()=>{
    function outside(event:MouseEvent){if(rootRef.current&&!rootRef.current.contains(event.target as Node))setOpen(false)}
    if(open)document.addEventListener('mousedown',outside);
    return()=>document.removeEventListener('mousedown',outside);
  },[open]);

  async function mark(id:string){
    const item=items.find(x=>x.id===id);if(!item||item.read_at)return;
    const response=await fetch('/api/notifications',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({id})});
    if(response.ok){setItems(current=>current.map(x=>x.id===id?{...x,read_at:new Date().toISOString()}:x));setUnread(current=>Math.max(0,current-1));}
  }
  async function markAll(){
    const response=await fetch('/api/notifications',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({all:true})});
    if(response.ok){const now=new Date().toISOString();setItems(current=>current.map(x=>({...x,read_at:x.read_at||now})));setUnread(0);}
  }

  if(!available)return null;
  return <div ref={rootRef} style={{position:'fixed',top:14,right:16,zIndex:90}}>
    <button onClick={()=>setOpen(v=>!v)} aria-haspopup="dialog" aria-expanded={open} aria-label={en?'Notifications':'Notiser'} style={{width:44,height:44,borderRadius:22,border:'1px solid var(--line)',background:'#fff',display:'grid',placeItems:'center',position:'relative',boxShadow:'0 6px 22px rgba(0,0,0,.08)',cursor:'pointer',fontSize:20}}>
      <span aria-hidden="true">🔔</span>{unread>0?<span aria-label={en?`${unread} unread`:`${unread} olästa`} style={{position:'absolute',right:-3,top:-3,minWidth:20,height:20,padding:'0 5px',borderRadius:10,background:'#111',color:'#fff',fontSize:11,fontWeight:800,display:'grid',placeItems:'center'}}>{unread>99?'99+':unread}</span>:null}
    </button>
    {open?<section role="dialog" aria-label={en?'Notification center':'Notiscenter'} style={{position:'absolute',right:0,top:52,width:'min(390px,calc(100vw - 24px))',maxHeight:'70vh',overflow:'auto',background:'#fff',border:'1px solid var(--line)',borderRadius:18,boxShadow:'0 18px 50px rgba(0,0,0,.18)',padding:14}}>
      <header style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:12,padding:'2px 4px 12px'}}><strong>{en?'Notifications':'Notiser'}</strong>{unread>0?<button onClick={()=>void markAll()} style={{border:0,background:'none',fontWeight:700,cursor:'pointer'}}>{en?'Mark all read':'Markera alla lästa'}</button>:null}</header>
      <div style={{display:'grid',gap:8}}>{items.length?items.map(item=><a key={item.id} href={item.url||'#'} onClick={()=>void mark(item.id)} style={{display:'block',padding:'12px 13px',borderRadius:14,border:'1px solid var(--line)',background:item.read_at?'#fff':'rgba(198,240,0,.12)',color:'inherit',textDecoration:'none'}}><div style={{display:'flex',justifyContent:'space-between',gap:10}}><strong style={{fontSize:14}}>{item.title}</strong>{!item.read_at?<span aria-label={en?'Unread':'Oläst'} style={{width:8,height:8,borderRadius:8,background:'#111',marginTop:5,flex:'0 0 auto'}}/>:null}</div><p style={{margin:'5px 0',fontSize:13,lineHeight:1.4}}>{item.body}</p><small style={{color:'var(--muted)'}}>{new Date(item.created_at).toLocaleString(en?'en-GB':'sv-SE')}</small></a>):<div style={{padding:22,textAlign:'center',color:'var(--muted)'}}>{en?'No notifications yet.':'Inga notiser ännu.'}</div>}</div>
      <footer style={{padding:'12px 4px 2px',textAlign:'center'}}><Link href={`/${locale}/profil/notiser`} onClick={()=>setOpen(false)} style={{fontWeight:800,color:'inherit'}}>{en?'Notification settings':'Notisinställningar'}</Link></footer>
    </section>:null}
  </div>;
}
