'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

type RiskFlag={id:string;severity:string;status:string;reason:string;created_at:string;booking_id?:string|null};

export default function AdminUserOperations({userId,currentStatus,flags=[]}:{userId:string;currentStatus:string;flags?:RiskFlag[]}){
  const router=useRouter();
  const [status,setStatus]=useState(currentStatus||'active');
  const [accountReason,setAccountReason]=useState('');
  const [listingReason,setListingReason]=useState('');
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
    if(r.ok){
      setMessage('Sparat.');
      if(action==='support_note')setNote('');
      if(action==='risk_flag')setFlagReason('');
      if(action==='listing_moderation')setListingReason('');
      router.refresh();
    }else setMessage(j.error||'Åtgärden misslyckades.');
    setBusy('');
  }

  return <section style={card}><div style={{display:'flex',justifyContent:'space-between',gap:16,alignItems:'baseline',flexWrap:'wrap'}}><h2 style={{marginTop:0}}>Operations</h2><span style={{fontSize:13,color:'var(--muted)'}}>Åtgärder loggas i admin audit</span></div>
    <div style={grid}>
      <div><h3>Kontostatus</h3><label style={label}>Status<select value={status} onChange={e=>setStatus(e.target.value)} style={input}><option value="active">Aktivt</option><option value="restricted">Begränsat</option><option value="frozen">Fryst</option></select></label><label style={label}>Motivering<textarea value={accountReason} onChange={e=>setAccountReason(e.target.value)} style={input} placeholder="Obligatorisk vid begränsning/frysning"/></label><button disabled={!!busy} onClick={()=>act('account_status',{status,reason:accountReason})} style={button}>{busy==='account_status'?'Sparar…':'Uppdatera konto'}</button></div>
      <div><h3>Privat supportnotering</h3><label style={label}>Notering<textarea value={note} onChange={e=>setNote(e.target.value)} style={input} placeholder="Syns endast för admin"/></label><button disabled={!!busy||!note.trim()} onClick={()=>act('support_note',{note})} style={button}>{busy==='support_note'?'Sparar…':'Lägg till notering'}</button></div>
      <div><h3>Ny riskflagga</h3><label style={label}>Allvar<select value={severity} onChange={e=>setSeverity(e.target.value)} style={input}><option value="low">Låg</option><option value="medium">Medel</option><option value="high">Hög</option><option value="critical">Kritisk</option></select></label><label style={label}>Orsak<textarea value={flagReason} onChange={e=>setFlagReason(e.target.value)} style={input}/></label><button disabled={!!busy||flagReason.trim().length<3} onClick={()=>act('risk_flag',{severity,reason:flagReason})} style={button}>{busy==='risk_flag'?'Sparar…':'Skapa flagga'}</button></div>
      <div><h3>Annonsmoderering</h3><label style={label}>Produkt-id<input value={productId} onChange={e=>setProductId(e.target.value)} style={input} placeholder="Sanity product id"/></label><label style={label}>Åtgärd<select value={listingStatus} onChange={e=>setListingStatus(e.target.value)} style={input}><option value="hidden">Dölj från Hyrbart</option><option value="active">Återaktivera</option></select></label><label style={label}>Motivering<textarea value={listingReason} onChange={e=>setListingReason(e.target.value)} style={input}/></label><button disabled={!!busy||!productId.trim()} onClick={()=>act('listing_moderation',{productId,status:listingStatus,reason:listingReason})} style={button}>{busy==='listing_moderation'?'Sparar…':'Uppdatera annons'}</button></div>
    </div>

    <div style={{marginTop:24,borderTop:'1px solid var(--line)',paddingTop:18}}><h3 style={{marginTop:0}}>Aktiva riskflaggor</h3>{flags.filter(f=>['open','reviewing'].includes(f.status)).map(flag=><article key={flag.id} style={flagRow}><div style={{minWidth:0}}><strong>{flag.severity.toUpperCase()} · {flag.status==='reviewing'?'Under granskning':'Öppen'}</strong><small style={{display:'block',color:'var(--muted)',marginTop:3}}>{new Date(flag.created_at).toLocaleString('sv-SE')}{flag.booking_id?` · Bokning ${flag.booking_id.slice(0,8).toUpperCase()}`:''}</small><p style={{margin:'8px 0 0'}}>{flag.reason}</p></div><div style={{display:'flex',gap:8,flexWrap:'wrap',justifyContent:'flex-end'}}>{flag.status==='open'?<button disabled={!!busy} onClick={()=>act('risk_flag_status',{flagId:flag.id,status:'reviewing'})} style={secondaryButton}>Granska</button>:null}<button disabled={!!busy} onClick={()=>act('risk_flag_status',{flagId:flag.id,status:'resolved'})} style={secondaryButton}>Lös</button><button disabled={!!busy} onClick={()=>act('risk_flag_status',{flagId:flag.id,status:'dismissed'})} style={secondaryButton}>Avfärda</button></div></article>)}{!flags.some(f=>['open','reviewing'].includes(f.status))?<p style={{color:'var(--muted)'}}>Inga aktiva riskflaggor.</p>:null}</div>

    {message?<p style={{fontWeight:700}}>{message}</p>:null}
  </section>;
}

const card={background:'#fff',border:'1px solid var(--line)',borderRadius:20,padding:'18px 20px',marginTop:24} as const;
const grid={display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(240px,1fr))',gap:24} as const;
const label={display:'grid',gap:6,fontSize:13,fontWeight:700,margin:'10px 0'} as const;
const input={width:'100%',boxSizing:'border-box' as const,border:'1px solid var(--line)',borderRadius:12,padding:'10px 12px',font:'inherit',background:'#fff'} as const;
const button={border:0,borderRadius:999,padding:'11px 16px',fontWeight:800,cursor:'pointer',background:'var(--accent,#c6f000)'} as const;
const secondaryButton={border:'1px solid var(--line)',borderRadius:999,padding:'9px 13px',fontWeight:800,cursor:'pointer',background:'#fff'} as const;
const flagRow={display:'grid',gridTemplateColumns:'minmax(0,1fr) auto',gap:16,alignItems:'center',padding:'14px 0',borderTop:'1px solid var(--line)'} as const;
