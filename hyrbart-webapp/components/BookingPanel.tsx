'use client';

import { useMemo, useState } from 'react';
import styles from './BookingPanel.module.css';

type BookingPanelProps = { locale: string; productName: string; price?: string };

function parseDailyPrice(price?: string) {
  if (!price) return null;
  const match = price.match(/(\d[\d\s]*)/);
  return match ? Number(match[1].replace(/\s/g, '')) : null;
}
function dateValue(date: Date) { const y=date.getFullYear(); const m=String(date.getMonth()+1).padStart(2,'0'); const d=String(date.getDate()).padStart(2,'0'); return `${y}-${m}-${d}`; }
function formatDate(value: string, en: boolean) { if (!value) return en?'Select date':'Välj datum'; return new Intl.DateTimeFormat(en?'en-GB':'sv-SE',{day:'numeric',month:'short',year:'numeric'}).format(new Date(`${value}T12:00:00`)); }

export default function BookingPanel({ locale, productName, price }: BookingPanelProps) {
  const en=locale==='en'; const today=useMemo(()=>dateValue(new Date()),[]); const [from,setFrom]=useState(''); const [to,setTo]=useState(''); const dailyPrice=parseDailyPrice(price);
  const days=useMemo(()=>{ if(!from||!to)return 0; const start=new Date(`${from}T12:00:00`); const end=new Date(`${to}T12:00:00`); return Math.max(1,Math.round((end.getTime()-start.getTime())/86400000)+1); },[from,to]);
  const total=dailyPrice&&days?dailyPrice*days:null; const ready=Boolean(from&&to&&new Date(to)>=new Date(from));
  return <section className={styles.panel} aria-label={en?'Book product':'Boka produkt'}>
    <div className={styles.heading}><div><span>{en?'Choose when you need it':'När behöver du den?'}</span><h2>{en?'Select rental period':'Välj hyresperiod'}</h2></div>{price?<strong>{price}</strong>:null}</div>
    <div className={styles.dates}>
      <label><span>{en?'Pick up':'Hämta'}</span><strong>{formatDate(from,en)}</strong><input aria-label={en?'Pick-up date':'Hämtningsdatum'} type="date" min={today} value={from} onChange={e=>{const value=e.target.value;setFrom(value);if(to&&to<value)setTo(value)}}/></label>
      <span className={styles.arrow} aria-hidden="true">→</span>
      <label><span>{en?'Return':'Lämna tillbaka'}</span><strong>{formatDate(to,en)}</strong><input aria-label={en?'Return date':'Återlämningsdatum'} type="date" min={from||today} value={to} onChange={e=>setTo(e.target.value)}/></label>
    </div>
    {ready?<div className={styles.summary}><div><span>{en?'Rental period':'Hyresperiod'}</span><strong>{days} {en?(days===1?'day':'days'):(days===1?'dag':'dagar')}</strong></div>{total!=null?<div><span>{en?'Estimated total':'Beräknat pris'}</span><strong>{total.toLocaleString(en?'en-GB':'sv-SE')} kr</strong></div>:null}</div>:null}
    <button className={styles.button} type="button" disabled={!ready} onClick={()=>{if(ready)window.alert(en?`Booking flow for ${productName} continues in the next step.`:`Bokningsflödet för ${productName} fortsätter i nästa steg.`)}}>{ready?(en?'Continue':'Fortsätt'):(en?'Select dates':'Välj datum')}</button>
    <p className={styles.footnote}>{en?'No payment is made at this step.':'Ingen betalning görs i det här steget.'}</p>
  </section>;
}
