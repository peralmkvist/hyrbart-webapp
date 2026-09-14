'use client';

import Link from 'next/link';
import { useState } from 'react';

type Props = {
  locale: string;
  query?: string;
  category?: string;
  place?: string;
  radius?: string;
  from?: string;
  to?: string;
  maxPrice?: string;
  minRating?: string;
  discountOnly?: boolean;
  resultCount: number;
  lat?: number;
  lng?: number;
};

export default function SearchAlertCreate({ locale, query = '', category = '', place = '', radius = '10', from = '', to = '', maxPrice = '', minRating = '', discountOnly = false, resultCount, lat, lng }: Props) {
  const en = locale === 'en';
  const [open, setOpen] = useState(false);
  const [price, setPrice] = useState(maxPrice);
  const [channel, setChannel] = useState<'in_app' | 'in_app_push'>('in_app_push');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const eligible = Boolean(from && place.trim() && (query.trim() || category) && resultCount <= 3);
  if (!eligible) return null;

  async function save() {
    setSaving(true);
    setError('');
    try {
      const response = await fetch('/api/search-alerts', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ query, category, place, radius, from, to: to || from, maxPrice: price, minRating, discountOnly, locale, notificationChannel: channel, lat, lng }),
      });
      if (response.status === 401) {
        window.location.href = `/topsecret/${locale}/logga-in?next=${encodeURIComponent(window.location.pathname + window.location.search)}`;
        return;
      }
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'SAVE_FAILED');
      setSaved(true);
    } catch {
      setError(en ? 'The watch could not be saved. Check the criteria and try again.' : 'Bevakningen kunde inte sparas. Kontrollera kriterierna och försök igen.');
    } finally {
      setSaving(false);
    }
  }

  const period = `${from}${to && to !== from ? ` – ${to}` : ''}`;
  const product = query || category || (en ? 'Current search' : 'Aktuell sökning');
  const location = `${place} · ${radius} km`;

  return <section style={{margin:'14px 0 22px',padding:'18px',border:'1px solid var(--line)',borderRadius:20,background:'#fff'}} aria-label={en?'Watch this search':'Bevaka sökningen'}>
    <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',gap:14,flexWrap:'wrap'}}>
      <div style={{maxWidth:620}}>
        <strong style={{display:'block',fontSize:'1.05rem'}}>{resultCount === 0 ? (en?'No match right now?':'Ingen träff just nu?') : (en?'Few matches right now?':'Få träffar just nu?')}</strong>
        <p style={{margin:'5px 0 0',color:'var(--muted)',lineHeight:1.45}}>{en?'Save the search and we will notify you if a matching rental becomes available for your dates and price limit.':'Spara sökningen så meddelar vi dig om en matchande annons blir ledig för dina datum och ditt maxpris.'}</p>
      </div>
      <button type="button" onClick={()=>setOpen(value=>!value)} style={{minHeight:43,padding:'0 16px',border:'1px solid #111',borderRadius:999,background:'#111',color:'#fff',fontWeight:800,cursor:'pointer'}}>{saved?(en?'Watching':'Bevakas'):(en?'Watch search':'Bevaka sökningen')}</button>
    </div>

    {open ? <div style={{marginTop:16,paddingTop:16,borderTop:'1px solid var(--line)'}}>
      {saved ? <div><strong>{en?'Watch saved':'Bevakningen är sparad'}</strong><p style={{color:'var(--muted)'}}>{en?'We will re-check availability and the mandatory total price before notifying you. A notification is not a reservation or guarantee.':'Vi kontrollerar tillgänglighet och obligatoriskt totalpris på nytt innan en notis skickas. En notis är inte en reservation eller garanti.'}</p><Link href={`/topsecret/${locale}/profil/bevakningar`}>{en?'Manage watches':'Hantera bevakningar'} →</Link></div> : <>
        <h3 style={{margin:'0 0 12px'}}>{en?'Confirm watch':'Bekräfta bevakning'}</h3>
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(180px,1fr))',gap:10,marginBottom:14}}>
          <div><small style={{color:'var(--muted)'}}>{en?'Product':'Produkt'}</small><strong style={{display:'block'}}>{product}</strong></div>
          <div><small style={{color:'var(--muted)'}}>{en?'Location':'Plats'}</small><strong style={{display:'block'}}>{location}</strong></div>
          <div><small style={{color:'var(--muted)'}}>{en?'Period':'Period'}</small><strong style={{display:'block'}}>{period}</strong></div>
          <label><small style={{color:'var(--muted)',display:'block'}}>{en?'Maximum total price':'Maximalt totalpris'}</small><span style={{display:'flex',alignItems:'center',gap:6}}><input type="number" min="1" step="1" value={price} onChange={event=>setPrice(event.target.value)} placeholder={en?'No limit':'Ingen gräns'} style={{width:130,minHeight:38,border:'1px solid var(--line)',borderRadius:10,padding:'0 10px'}}/> kr</span></label>
        </div>
        <label style={{display:'grid',gap:6,maxWidth:360,marginBottom:14}}><span style={{fontWeight:750}}>{en?'Notification':'Notifiering'}</span><select value={channel} onChange={event=>setChannel(event.target.value as 'in_app'|'in_app_push')} style={{minHeight:42,border:'1px solid var(--line)',borderRadius:10,padding:'0 10px',background:'#fff'}}><option value="in_app_push">{en?'Notification centre + Web Push':'Notiscenter + Web Push'}</option><option value="in_app">{en?'Notification centre only':'Endast notiscenter'}</option></select></label>
        {minRating || discountOnly ? <p style={{fontSize:13,color:'var(--muted)'}}>{minRating ? `★ ${minRating}+` : null}{minRating && discountOnly ? ' · ' : null}{discountOnly ? (en?'discount required':'rabatt krävs') : null}</p> : null}
        <p style={{fontSize:13,color:'var(--muted)',lineHeight:1.4}}>{en?'The exact search centre and radius are saved with this watch. We notify only after checking the criteria again.':'Exakt sökcentrum och radie sparas med bevakningen. Vi skickar bara notis efter att kriterierna kontrollerats igen.'}</p>
        {error ? <p role="alert" style={{color:'#9b1c1c'}}>{error}</p> : null}
        <div style={{display:'flex',justifyContent:'flex-end',gap:8}}><button type="button" onClick={()=>setOpen(false)} style={{minHeight:42,padding:'0 14px',border:'1px solid var(--line)',borderRadius:12,background:'#fff',fontWeight:750}}>{en?'Cancel':'Avbryt'}</button><button type="button" disabled={saving} onClick={()=>void save()} style={{minHeight:42,padding:'0 14px',border:'1px solid var(--accent)',borderRadius:12,background:'var(--accent)',color:'#111',fontWeight:850}}>{saving?(en?'Saving…':'Sparar…'):(en?'Create watch':'Skapa bevakning')}</button></div>
      </>}
    </div> : null}
  </section>;
}
