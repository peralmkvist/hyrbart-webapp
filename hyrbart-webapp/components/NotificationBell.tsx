'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import styles from './NotificationBell.module.css';

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
  return <div ref={rootRef} className={styles.root}>
    <button onClick={()=>setOpen(v=>!v)} aria-haspopup="dialog" aria-expanded={open} aria-label={en?'Notifications':'Notiser'} className={styles.trigger}>
      <span aria-hidden="true">🔔</span>{unread>0?<span aria-label={en?`${unread} unread`:`${unread} olästa`} className={styles.badge}>{unread>99?'99+':unread}</span>:null}
    </button>
    {open?<section role="dialog" aria-label={en?'Notification center':'Notiscenter'} className={styles.dialog}>
      <header className={styles.header}><strong>{en?'Notifications':'Notiser'}</strong>{unread>0?<button onClick={()=>void markAll()} className={styles.markAll}>{en?'Mark all read':'Markera alla lästa'}</button>:null}</header>
      <div className={styles.list}>{items.length?items.map(item=><a key={item.id} href={item.url||'#'} onClick={()=>void mark(item.id)} className={`${styles.item} ${item.read_at?'':styles.unread}`}><div className={styles.itemHeader}><strong className={styles.itemTitle}>{item.title}</strong>{!item.read_at?<span aria-label={en?'Unread':'Oläst'} className={styles.unreadDot}/>:null}</div><p className={styles.body}>{item.body}</p><small className={styles.timestamp}>{new Date(item.created_at).toLocaleString(en?'en-GB':'sv-SE')}</small></a>):<div className={styles.empty}>{en?'No notifications yet.':'Inga notiser ännu.'}</div>}</div>
      <footer className={styles.footer}><Link href={`/${locale}/profil/notiser`} onClick={()=>setOpen(false)} className={styles.settingsLink}>{en?'Notification settings':'Notisinställningar'}</Link></footer>
    </section>:null}
  </div>;
}
