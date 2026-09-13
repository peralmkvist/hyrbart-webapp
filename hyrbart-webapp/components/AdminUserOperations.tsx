'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function AdminUserOperations({userId,currentStatus}:{userId:string;currentStatus:string}){
  const router=useRouter();
  const [status,setStatus]=useState(currentStatus||'active');
  const [reason,setReason]=useState('');
  const [note,setNote]=useState('');
  const [flagReason,setFlagReason]=useState('');
  const [severity,setSeverity]=useState('medium');
  const [productId,setProductId]=useState('');
  const [listingStatus,setListingStatus]=useState('hidden');
  const [busy,setBusy]=useState('');
  const [message,setMessage]=useState('');

  async function act(action:string,payload:Record<string,unknown>){
    setBusy(action);setMessage('');
    const r=await fetch(`/api/admin/users/${userId}/operations`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action,...payload})});
    const j=await r.json().catch(()=>({}));
    if(r.ok){setMessage('Sparat.');router.refresh();if(action==='support_note')setNote('');if(action==='risk_flag')setFlagReason('')}else setMessage(j.error||'Åtgärden misslyckades.');
    setBusy('');
  }

  return <section style={card}><h2 style={{marginTop:0}}>Operations</h2>
    <div style={grid}>
      <div><h3>Kontostatus</h3><label style={label}>Status<select value={status} onChange={e=>setStatus(e.target.value)} style={input}><option value="active">Aktivt</option><option value="restricted">Begränsat</option><option value="frozen">Fryst</option></select></label><label style={label}>Motivering<textarea value={reason} onChange={e=>setReason(e.target.value)} style={input} placeholder="Obligatorisk vid begränsning/frysning"/></label><button disabled={!!busy} onClick={()=>act('account_status',{status,reason})} style={button}>{busy==='account_status'?'Sparar…':'Uppdatera konto'}</button></div>
      <div><h3>Privat supportnotering</h3><label style={label}>Notering<textarea value={note} onChange={e=>setNote(e.target.value)} style={input} placeholder="Syns endast för admin"/></label><button disabled={!!busy||!note.trim()} onClick={()=>act('support_note',{note})} style={button}>{busy==='support_note'?'Sparar…':'Lägg till notering'}</button></div>
      <div><h3>Riskflagga</h3><label style={label}>Allvar<select value={severity} onChange={e=>setSeverity(e.target.value)} style={input}><option value="low">Låg</option><option value="medium">Medel</option><option value="high">Hög</option><option value="critical">Kritisk</option></select></label><label style={label}>Orsak<textarea value={flagReason} onChange={e=>setFlagReason(e.target.value)} style={input}/></label><button disabled={!!busy||flagReason.trim().length<3} onClick={()=>act('risk_flag',{severity,reason:flagReason})} style={button}>{busy==='risk_flag'?'Sparar…':'Skapa flagga'}</button></div>
      <div><h3>Annonsmoderering</h3><label style={label}>Produkt-id<input value={productId} onChange={e=>setProductId(e.target.value)} style={input} placeholder="Sanity product id"/></label><label style={label}>Åtgärd<select value={listingStatus} onChange={e=>setListingStatus(e.target.value)} style={input}><option value="hidden">Dölj från Hyrbart</option><option value="active">Återaktivera</option></select></label><label style={label}>Motivering<textarea value={reason} onChange={e=>setReason(e.target.value)} style={input}/></label><button disabled={!!busy||!productId.trim()} onClick={()=>act('listing_moderation',{productId,status:listingStatus,reason})} style={button}>{busy==='listing_moderation'?'Sparar…':'Uppdatera annons'}</button></div>
    </div>{message?<p style={{fontWeight:700}}>{message}</p>:null}
  </section>;
}

const card={background:'#fff',border:'1px solid var(--line)',borderRadius:20,padding:'18px 20px',marginTop:24} as const;
const grid={display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(240px,1fr))',gap:24} as const;
const label={display:'grid',gap:6,fontSize:13,fontWeight:700,margin:'10px 0'} as const;
const input={width:'100%',boxSizing:'border-box' as const,border:'1px solid var(--line)',borderRadius:12,padding:'10px 12px',font:'inherit',background:'#fff'} as const;
const button={border:0,borderRadius:999,padding:'11px 16px',fontWeight:800,cursor:'pointer',background:'var(--accent,#c6f000)'} as const;
