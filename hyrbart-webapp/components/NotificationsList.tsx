'use client';
import { useEffect, useState } from 'react';

type Item = { id:string; title:string; body:string; url:string|null; read_at:string|null; created_at:string; notification_type:string; push_status:string; email_status:string };
type Preferences = { push_enabled:boolean; email_enabled:boolean; reminder_enabled:boolean; review_enabled:boolean; locale:string };
const defaults:Preferences={push_enabled:true,email_enabled:true,reminder_enabled:true,review_enabled:true,locale:'sv'};

export default function NotificationsList({ locale }: { locale:string }) {
  const [items,setItems]=useState<Item[]>([]),[loading,setLoading]=useState(true),[busy,setBusy]=useState(false);
  const [unread,setUnread]=useState(0),[prefs,setPrefs]=useState<Preferences>({...defaults,locale}),[savingPrefs,setSavingPrefs]=useState(false),[prefMessage,setPrefMessage]=useState('');

  async function load(){
    setLoading(true);
    const [notificationsResponse,prefsResponse]=await Promise.all([
      fetch('/api/notifications',{cache:'no-store'}),
      fetch('/api/notifications/preferences',{cache:'no-store'}),
    ]);
    const [notificationsJson,prefsJson]=await Promise.all([notificationsResponse.json().catch(()=>({})),prefsResponse.json().catch(()=>({}))]);
    setItems(notificationsJson.notifications||[]);
    setUnread(Number(notificationsJson.unread||0));
    setPrefs({...defaults,...(prefsJson.preferences||{}),locale});
    setLoading(false);
  }
  useEffect(()=>{void load()},[]);

  async function mark(id:string){
    const current=items.find(x=>x.id===id);
    if(current?.read_at)return;
    const r=await fetch('/api/notifications',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({id})});
    if(!r.ok)return;
    setItems(v=>v.map(x=>x.id===id?{...x,read_at:new Date().toISOString()}:x));
    setUnread(v=>Math.max(0,v-1));
  }
  async function markAll(){
    setBusy(true);
    const r=await fetch('/api/notifications',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({all:true})});
    if(r.ok){setItems(v=>v.map(x=>({...x,read_at:x.read_at||new Date().toISOString()})));setUnread(0)}
    setBusy(false);
  }
  async function savePreferences(next:Preferences){
    setPrefs(next);setSavingPrefs(true);setPrefMessage('');
    const r=await fetch('/api/notifications/preferences',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify(next)});
    if(!r.ok)setPrefMessage(locale==='en'?'Could not save settings.':'Kunde inte spara inställningarna.');
    else setPrefMessage(locale==='en'?'Saved.':'Sparat.');
    setSavingPrefs(false);
  }
  function select(key:'push_enabled'|'reminder_enabled'|'review_enabled',value:string){void savePreferences({...prefs,[key]:value==='on',locale})}

  if(loading)return <div style={{padding:24}}>{locale==='en'?'Loading…':'Laddar…'}</div>;
  const labelOn=locale==='en'?'On':'På',labelOff=locale==='en'?'Off':'Av';
  return <div style={{padding:'0 20px 100px'}}>
    <section style={{border:'1px solid var(--line)',borderRadius:18,padding:'16px 18px',margin:'8px 0 20px',background:'#fff'}}>
      <div style={{display:'flex',justifyContent:'space-between',gap:16,alignItems:'flex-start',marginBottom:12}}><div><strong>{locale==='en'?'Notification settings':'Notisinställningar'}</strong><p style={{margin:'4px 0 0',fontSize:13,color:'var(--muted)'}}>{locale==='en'?'In-app notifications are always kept in your notification center.':'Notiser i appen sparas alltid i ditt notiscenter.'}</p></div>{savingPrefs?<small style={{color:'var(--muted)'}}>{locale==='en'?'Saving…':'Sparar…'}</small>:prefMessage?<small style={{color:'var(--muted)'}}>{prefMessage}</small>:null}</div>
      <div style={{display:'grid',gap:10}}>
        <PreferenceRow label={locale==='en'?'Push notifications':'Pushnotiser'} value={prefs.push_enabled} onChange={v=>select('push_enabled',v)} onLabel={labelOn} offLabel={labelOff}/>
        <PreferenceRow label={locale==='en'?'Pickup & return reminders':'Påminnelser om hämtning & retur'} value={prefs.reminder_enabled} onChange={v=>select('reminder_enabled',v)} onLabel={labelOn} offLabel={labelOff}/>
        <PreferenceRow label={locale==='en'?'Review reminders':'Omdömespåminnelser'} value={prefs.review_enabled} onChange={v=>select('review_enabled',v)} onLabel={labelOn} offLabel={labelOff}/>
      </div>
    </section>

    <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:12,margin:'8px 0 18px'}}><p style={{margin:0,color:'var(--muted)'}}>{unread?(locale==='en'?`${unread} unread`:`${unread} olästa`):(locale==='en'?'You are up to date.':'Du är uppdaterad.')}</p>{unread?<button onClick={markAll} disabled={busy} style={{border:0,background:'none',fontWeight:700,cursor:'pointer'}}>{busy?(locale==='en'?'Marking…':'Markerar…'):(locale==='en'?'Mark all as read':'Markera alla som lästa')}</button>:null}</div>
    <div style={{display:'grid',gap:10}}>{items.map(item=><a key={item.id} href={item.url||`/topsecret/${locale}/profil/notiser`} onClick={()=>{if(!item.read_at)void mark(item.id)}} style={{display:'block',padding:'16px 18px',border:'1px solid var(--line)',borderRadius:18,background:item.read_at?'#fff':'rgba(198,240,0,.12)',color:'inherit',textDecoration:'none'}}><div style={{display:'flex',justifyContent:'space-between',gap:12}}><strong>{item.title}</strong>{!item.read_at?<span aria-label={locale==='en'?'Unread':'Oläst'} style={{width:9,height:9,borderRadius:'50%',background:'var(--accent,#c6f000)',flex:'0 0 auto',marginTop:5}}/>:null}</div><p style={{margin:'6px 0 8px',lineHeight:1.45}}>{item.body}</p><small style={{color:'var(--muted)'}}>{new Date(item.created_at).toLocaleString(locale==='en'?'en-GB':'sv-SE')}</small></a>)}{!items.length?<div style={{padding:'28px 18px',textAlign:'center',border:'1px solid var(--line)',borderRadius:18,color:'var(--muted)'}}>{locale==='en'?'No notifications yet.':'Inga notiser ännu.'}</div>:null}</div>
  </div>;
}

function PreferenceRow({label,value,onChange,onLabel,offLabel}:{label:string;value:boolean;onChange:(value:string)=>void;onLabel:string;offLabel:string}){
  return <label style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:16,padding:'8px 0',borderTop:'1px solid var(--line)'}}><span style={{fontWeight:700,fontSize:14}}>{label}</span><select value={value?'on':'off'} onChange={e=>onChange(e.target.value)} style={{border:'1px solid var(--line)',borderRadius:12,padding:'8px 28px 8px 10px',background:'#fff',font:'inherit'}}><option value="on">{onLabel}</option><option value="off">{offLabel}</option></select></label>;
}
