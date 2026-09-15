'use client';

import { useEffect, useState } from 'react';
import styles from './NotificationPreferences.module.css';

type Channel='in_app'|'push'|'email'|'sms';
type Row={type:string;in_app:boolean;push:boolean;email:boolean;sms:boolean;mandatoryInApp:boolean;classification:'transactional'|'optional_product';priority:string;slaMinutes:number;recipient:string;maxExternalPer24h:number|null;digest:'none'|'eligible'};
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

  async function resetRecommended(){
    setSaving('reset');setMessage('');
    const response=await fetch('/api/notifications/preferences',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'reset_recommended'})});
    if(response.ok){await load();setMessage(en?'Recommended settings restored.':'Rekommenderade inställningar återställda.');}
    else setMessage(en?'Could not restore recommended settings.':'Kunde inte återställa rekommenderade inställningar.');
    setSaving('');
  }

  if(loading)return <div className={styles.loading}>{en?'Loading settings…':'Laddar inställningar…'}</div>;
  const channelHead=(channel:Channel)=>channel==='in_app'?(en?'App':'App'):channel==='push'?'Push':channel==='email'?(en?'Email':'E-post'):'SMS';
  return <div className={styles.page}>
    <section className={styles.channelCard}>
      <strong>{en?'Channels':'Kanaler'}</strong>
      <div className={styles.channelList}>
        <span>Push: {channels?.push.active?(en?'active on this account':'aktiv på kontot'):(en?'not activated on a device yet':'inte aktiverad på någon enhet ännu')}</span>
        <span>{en?'Email':'E-post'}: {channels?.email.active?(en?'available':'tillgänglig'):(en?'requires a verified email and configured delivery provider':'kräver verifierad e-post och konfigurerad leverans')}</span>
        <span>SMS: {channels?.sms.active?(en?'active':'aktiv'):(en?'preference can be saved now; delivery provider is not active yet':'inställningen kan sparas nu; leveransleverantör är ännu inte aktiv')}</span>
      </div>
    </section>
    <section className={styles.preferencesCard}>
      <div className={styles.header}><div><strong>{en?'Notification preferences':'Notisinställningar'}</strong><div className={styles.subtext}>{en?'Choose channel per notification type.':'Välj kanal separat för varje notistyp.'}</div></div><button type="button" disabled={saving==='reset'} onClick={()=>void resetRecommended()} className={styles.resetButton}>{saving==='reset'?(en?'Restoring…':'Återställer…'):(en?'Restore recommended':'Återställ rekommenderat')}</button></div>
      <div className={styles.tableWrap}><table className={styles.table}><thead><tr><th className={styles.leftHead}>{en?'Notification':'Notistyp'}</th>{(['in_app','push','email','sms'] as Channel[]).map(channel=><th key={channel} className={styles.channelHead}>{channelHead(channel)}</th>)}</tr></thead><tbody>{rows.map(row=><tr key={row.type} className={styles.row}><td className={styles.typeCell}>{labels[row.type]?.[en?'en':'sv']||row.type}<div className={styles.meta}>{row.classification==='transactional'?(en?'Transactional':'Transaktionell'):(en?'Optional':'Valbar')} · SLA {row.slaMinutes<60?`${row.slaMinutes} min`:`${Math.round(row.slaMinutes/60)} h`}{row.maxExternalPer24h?` · max ${row.maxExternalPer24h}/24h`:''}</div>{row.mandatoryInApp?<div className={styles.required}>{en?'Required in app':'Obligatorisk i appen'}</div>:null}</td>{(['in_app','push','email','sms'] as Channel[]).map(channel=>{
        const disabled=(channel==='in_app'&&row.mandatoryInApp);
        const checked=Boolean(row[channel]);
        const key=`${row.type}:${channel}`;
        return <td key={channel} className={styles.checkboxCell}><input type="checkbox" checked={checked} disabled={disabled||saving===key||saving==='reset'} onChange={e=>void toggle(row.type,channel,e.target.checked)} aria-label={`${labels[row.type]?.[en?'en':'sv']||row.type} ${channelHead(channel)}`}/></td>;
      })}</tr>)}</tbody></table></div>
    </section>
    <p role="status" className={styles.status}>{message}</p>
    <p className={styles.footnote}>{en?'Required transaction messages remain visible in the app. Optional product notifications follow your choices. Duplicate event keys are suppressed, and optional external notifications are frequency-limited. SMS preferences are stored now but delivery remains inactive until an SMS provider is connected.':'Obligatoriska transaktionsmeddelanden är alltid synliga i appen. Valbara produktnotiser följer dina val. Dubbletter med samma eventnyckel stoppas och valbara externa notiser frekvensbegränsas. SMS-inställningar sparas redan nu men leverans är inaktiv tills en SMS-leverantör kopplats in.'}</p>
  </div>;
}
