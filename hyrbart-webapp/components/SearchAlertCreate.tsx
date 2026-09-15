'use client';

import Link from 'next/link';
import { useState } from 'react';
import styles from './SearchAlertCreate.module.css';

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

  return <section className={styles.card} aria-label={en?'Watch this search':'Bevaka sökningen'}>
    <div className={styles.header}>
      <div className={styles.copy}>
        <strong className={styles.title}>{resultCount === 0 ? (en?'No match right now?':'Ingen träff just nu?') : (en?'Few matches right now?':'Få träffar just nu?')}</strong>
        <p className={styles.description}>{en?'Save the search and we will notify you if a matching rental becomes available for your dates and price limit.':'Spara sökningen så meddelar vi dig om en matchande annons blir ledig för dina datum och ditt maxpris.'}</p>
      </div>
      <button type="button" onClick={()=>setOpen(value=>!value)} className={styles.toggle}>{saved?(en?'Watching':'Bevakas'):(en?'Watch search':'Bevaka sökningen')}</button>
    </div>

    {open ? <div className={styles.details}>
      {saved ? <div><strong>{en?'Watch saved':'Bevakningen är sparad'}</strong><p className={styles.muted}>{en?'We will re-check availability and the mandatory total price before notifying you. A notification is not a reservation or guarantee.':'Vi kontrollerar tillgänglighet och obligatoriskt totalpris på nytt innan en notis skickas. En notis är inte en reservation eller garanti.'}</p><Link href={`/topsecret/${locale}/profil/bevakningar`}>{en?'Manage watches':'Hantera bevakningar'} →</Link></div> : <>
        <h3 className={styles.confirmTitle}>{en?'Confirm watch':'Bekräfta bevakning'}</h3>
        <div className={styles.summaryGrid}>
          <div><small className={styles.summaryLabel}>{en?'Product':'Produkt'}</small><strong className={styles.summaryValue}>{product}</strong></div>
          <div><small className={styles.summaryLabel}>{en?'Location':'Plats'}</small><strong className={styles.summaryValue}>{location}</strong></div>
          <div><small className={styles.summaryLabel}>{en?'Period':'Period'}</small><strong className={styles.summaryValue}>{period}</strong></div>
          <label><small className={styles.priceLabel}>{en?'Maximum total price':'Maximalt totalpris'}</small><span className={styles.priceRow}><input type="number" min="1" step="1" value={price} onChange={event=>setPrice(event.target.value)} placeholder={en?'No limit':'Ingen gräns'} className={styles.priceInput}/> kr</span></label>
        </div>
        <label className={styles.notificationLabel}><span className={styles.notificationTitle}>{en?'Notification':'Notifiering'}</span><select value={channel} onChange={event=>setChannel(event.target.value as 'in_app'|'in_app_push')} className={styles.select}><option value="in_app_push">{en?'Notification centre + Web Push':'Notiscenter + Web Push'}</option><option value="in_app">{en?'Notification centre only':'Endast notiscenter'}</option></select></label>
        {minRating || discountOnly ? <p className={styles.meta}>{minRating ? `★ ${minRating}+` : null}{minRating && discountOnly ? ' · ' : null}{discountOnly ? (en?'discount required':'rabatt krävs') : null}</p> : null}
        <p className={styles.explanation}>{en?'The exact search centre and radius are saved with this watch. We notify only after checking the criteria again.':'Exakt sökcentrum och radie sparas med bevakningen. Vi skickar bara notis efter att kriterierna kontrollerats igen.'}</p>
        {error ? <p role="alert" className={styles.error}>{error}</p> : null}
        <div className={styles.actions}><button type="button" onClick={()=>setOpen(false)} className={styles.secondaryButton}>{en?'Cancel':'Avbryt'}</button><button type="button" disabled={saving} onClick={()=>void save()} className={styles.primaryButton}>{saving?(en?'Saving…':'Sparar…'):(en?'Create watch':'Skapa bevakning')}</button></div>
      </>}
    </div> : null}
  </section>;
}
