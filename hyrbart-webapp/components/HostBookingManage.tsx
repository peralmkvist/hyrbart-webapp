'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

type Props = { bookingId: string; status: string; locale: string; className?: string };

export default function HostBookingManage({ bookingId, status, locale, className }: Props) {
  const en = locale === 'en';
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const canRespond = status === 'requested' || status === 'reserved';
  const canCancel = status === 'accepted' || status === 'paid';
  const canComplete = status === 'returned';
  if (!canRespond && !canCancel && !canComplete) return null;

  async function update(nextStatus: 'accepted'|'declined'|'cancelled'|'completed') {
    setSaving(true); setError('');
    try {
      const response = await fetch(`/api/bookings/${bookingId}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus }),
      });
      const data = await response.json() as { error?: string };
      if (!response.ok) throw new Error(data.error || (en ? 'Could not update booking.' : 'Kunde inte uppdatera bokningen.'));
      setOpen(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : (en ? 'Could not update booking.' : 'Kunde inte uppdatera bokningen.'));
    } finally { setSaving(false); }
  }

  const description = canRespond
    ? (en ? 'Accept or decline the booking request.' : 'Godkänn eller neka bokningsförfrågan.')
    : canComplete
      ? (en ? 'The renter has documented the return. Complete the rental when the condition looks correct.' : 'Hyrestagaren har dokumenterat återlämningen. Avsluta uthyrningen när skicket ser korrekt ut.')
      : status === 'paid'
        ? (en ? 'Cancel this paid booking. In test mode the payment will be marked as refunded.' : 'Avboka den betalda bokningen. I testläget markeras betalningen som återbetald.')
        : (en ? 'Cancel this accepted booking.' : 'Avboka den godkända bokningen.');

  return <>
    <button type="button" className={className} onClick={() => setOpen(true)}>{en?'Manage booking':'Hantera bokning'} <span>›</span></button>
    {open ? <div role="dialog" aria-modal="true" onClick={() => !saving && setOpen(false)} style={{position:'fixed',inset:0,zIndex:1100,background:'rgba(0,0,0,.34)',display:'flex',alignItems:'flex-end',justifyContent:'center'}}>
      <div onClick={event=>event.stopPropagation()} style={{width:'min(100%,560px)',background:'#fff',borderRadius:'24px 24px 0 0',padding:'24px 20px calc(24px + env(safe-area-inset-bottom))',boxShadow:'0 -10px 40px rgba(0,0,0,.18)'}}>
        <h2 style={{margin:'0 0 8px'}}>{en?'Manage booking':'Hantera bokning'}</h2>
        <p style={{margin:'0 0 20px',color:'var(--muted)'}}>{description}</p>
        {error?<p style={{fontWeight:700,margin:'0 0 14px'}} role="alert">{error}</p>:null}
        <div style={{display:'grid',gap:10}}>
          {canRespond?<><button type="button" disabled={saving} onClick={()=>update('accepted')} style={{minHeight:52,border:0,borderRadius:16,background:'var(--accent)',fontWeight:850}}>{saving?(en?'Saving…':'Sparar…'):(en?'Accept booking':'Godkänn bokning')}</button><button type="button" disabled={saving} onClick={()=>update('declined')} style={{minHeight:52,border:'1px solid var(--line)',borderRadius:16,background:'#fff',fontWeight:750}}>{en?'Decline':'Neka'}</button></>:null}
          {canCancel?<button type="button" disabled={saving} onClick={()=>update('cancelled')} style={{minHeight:52,border:'1px solid var(--line)',borderRadius:16,background:'#fff',fontWeight:750}}>{status==='paid'?(en?'Cancel and refund':'Avboka och återbetala'):(en?'Cancel booking':'Avboka bokning')}</button>:null}
          {canComplete?<button type="button" disabled={saving} onClick={()=>update('completed')} style={{minHeight:52,border:0,borderRadius:16,background:'var(--accent)',fontWeight:850}}>{saving?(en?'Saving…':'Sparar…'):(en?'Confirm and complete rental':'Bekräfta och avsluta uthyrning')}</button>:null}
          <button type="button" disabled={saving} onClick={()=>setOpen(false)} style={{minHeight:48,border:0,background:'transparent',fontWeight:700}}>{en?'Close':'Stäng'}</button>
        </div>
      </div>
    </div>:null}
  </>;
}
