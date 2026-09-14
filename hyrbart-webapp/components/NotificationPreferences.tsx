'use client';

import { useEffect, useState } from 'react';

type Channel='in_app'|'push'|'email'|'sms';
type Row={type:string;in_app:boolean;push:boolean;email:boolean;sms:boolean;mandatoryInApp:boolean};
type Channels={push:{available:boolean;active:boolean};email:{available:boolean;active:boolean};sms:{available:boolean;active:boolean}};

const labels:Record<string,{sv:string;en:string}>={
  follower:{sv:'Nya följare',en:'New followers'},
  booking:{sv:'Nya bokningar',en:'New bookings'},
  booking_update:{sv:'Ändrade eller avbokade bokningar',en:'Booking changes or cancellations'},
  message:{sv:'Nya meddelanden',en:'New messages'},
  followed_host_listing:{sv:'Nya produkter från följda uthyrare',en:'New products from followed hosts'},
  favorite_price_change:{sv:'Prisändringar på favoriter',en:'Price changes on favorites'},
  search_alert:{sv:'Träffar från sökbevakningar',en:'Search alert matches'},
  pickup_return_reminder:{sv:'Påminnelser om hämtning och retur',en:'Pickup and return reminders'},
};

export default function NotificationPreferences({locale}:{locale:string}){
  const en=locale==='en';
  const [rows,setRows]=useState<Row[]>([]);
  const [channels,setChannels]=useState<Channels|null>(null);
  const [loading,setLoading]=useState(true);
  const [saving,setSaving]=useState('');
  const [message,setMessage]=useState('');

  async function load(){
    setLoading(true);
    const response=await fetch('/api/notifications/preferences',{cache:'no-store'});
    const json=await response.json().catch(()=>({})) as {preferences?:Row[];channels?:Channels};
    if(response.ok){setRows(json.preferences||[]);setChannels(json.channels||null)}
    setLoading(false);
  }
  useEffect(()=>{void load()},[]);

  async function toggle(type:string,channel:Channel,enabled:boolean){
    const key=`${type}:${channel}`;setSaving(key);setMessage('');
    const response=await fetch('/api/notifications/preferences',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({type,channel,enabled})});
    const json=await response.json().catch(()=>({})) as {error?:string};
    if(response.ok){setRows(current=>current.map(row=>row.type===type?{...row,[channel]:enabled}:row));setMessage(en?'Saved.':'Sparat.');}
    else setMessage(json.error==='MANDATORY_CHANNEL'?(en?'This in-app notification is required for the service to work.':'Den här appnotisen krävs för att tjänsten ska fungera.'):(en?'Could not save the setting.':'Kunde inte spara inställningen.'));
    setSaving('');
  }

  if(loading)return <div style={{padding:'18px 20px'}}>{en?'Loading settings…':'Laddar inställningar…'}</div>;
  const channelHead=(channel:Channel)=>channel==='in_app'?(en?'App':'App'):channel==='push'?'Push':channel==='email'?(en?'Email':'E-post'):'SMS';
  return <div style={{padding:'0 20px 100px',display:'grid',gap:16}}>
    <section style={{padding:16,border:'1px solid var(--line)',borderRadius:18,background:'#fff'}}>
      <strong>{en?'Channels':'Kanaler'}</strong>
      <div style={{display:'grid',gap:6,marginTop:8,fontSize:13,color:'var(--muted)'}}>
        <span>Push: {channels?.push.active?(en?'active on this account':'aktiv på kontot'):(en?'not activated on a device yet':'inte aktiverad på någon enhet ännu')}</span>
        <span>{en?'Email':'E-post'}: {channels?.email.active?(en?'available':'tillgänglig'):(en?'requires a verified email and configured delivery provider':'kräver verifierad e-post och konfigurerad leverans')}</span>
        <span>SMS: {channels?.sms.available?(en?'phone exists, delivery is not enabled yet':'telefonnummer finns, leverans är ännu inte aktiverad'):(en?'add a verified phone number first':'lägg först till ett verifierat telefonnummer')}</span>
      </div>
    </section>
    <section style={{border:'1px solid var(--line)',borderRadius:18,background:'#fff',overflow:'hidden'}}>
      <div style={{overflowX:'auto'}}><table style={{width:'100%',borderCollapse:'collapse',minWidth:650}}><thead><tr><th style={{textAlign:'left',padding:'14px 16px'}}>{en?'Notification':'Notistyp'}</th>{(['in_app','push','email','sms'] as Channel[]).map(channel=><th key={channel} style={{padding:'14px 10px',textAlign:'center'}}>{channelHead(channel)}</th>)}</tr></thead><tbody>{rows.map(row=><tr key={row.type} style={{borderTop:'1px solid var(--line)'}}><td style={{padding:'14px 16px',fontWeight:700}}>{labels[row.type]?.[en?'en':'sv']||row.type}{row.mandatoryInApp?<div style={{fontSize:11,color:'var(--muted)',fontWeight:500,marginTop:3}}>{en?'Required in app':'Obligatorisk i appen'}</div>:null}</td>{(['in_app','push','email','sms'] as Channel[]).map(channel=>{
        const disabled=(channel==='in_app'&&row.mandatoryInApp)||(channel==='sms'&&!channels?.sms.active)||(channel==='email'&&!channels?.email.available);
        const checked=Boolean(row[channel]);
        const key=`${row.type}:${channel}`;
        return <td key={channel} style={{padding:'12px 10px',textAlign:'center'}}><input type="checkbox" checked={checked} disabled={disabled||saving===key} onChange={e=>void toggle(row.type,channel,e.target.checked)} aria-label={`${labels[row.type]?.[en?'en':'sv']||row.type} ${channelHead(channel)}`}/></td>;
      })}</tr>)}</tbody></table></div>
    </section>
    <p role="status" style={{margin:0,minHeight:20,color:'var(--muted)',fontWeight:700}}>{message}</p>
    <p style={{margin:0,fontSize:13,color:'var(--muted)'}}>{en?'Required transaction and safety messages may still be delivered when needed for an active rental or account security. Marketing-style notifications always follow your choices above.':'Obligatoriska transaktions- och säkerhetsmeddelanden kan fortfarande skickas när de krävs för en aktiv uthyrning eller kontosäkerhet. Produkt- och marknadsnotiser följer alltid dina val ovan.'}</p>
  </div>;
}
